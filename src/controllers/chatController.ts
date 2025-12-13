import { Request, Response } from 'express';
import { AiService } from '../services/aiService';
import { SalesforceService } from '../services/salesforceService';
import dateParser from '../utils/dateParser';
import entityExtractor from '../utils/entityExtractor';
import contextManager from '../utils/contextManager';

const aiService = new AiService();
const salesforceService = new SalesforceService();

function getSessionId(req: Request): string {
  return req.headers['x-session-id'] as string || 'default-session';
}

// Helper function to extract WFH details using enhanced extractor
function extractWfhDetails(message: string): { date: string | null, reason: string | null, employeeName: string | null } {
  return entityExtractor.extractWfhDetails(message);
}

// Helper function to process WFH request
async function processWfhRequest(details: { date: string | null, reason: string | null, employeeName: string | null }): Promise<any> {
  if (!details.date || !details.reason) {
    throw new Error('Missing required fields');
  }
  
  return await salesforceService.createWfhRecord({
    employeeName: details.employeeName || 'Current User',
    date: details.date,
    reason: details.reason
  });
}

// Helper function to extract leave details using enhanced extractor
function extractLeaveDetails(message: string): { 
  startDate: string | null, 
  endDate: string | null, 
  leaveType: string | null, 
  reason: string | null, 
  employeeName: string | null 
} {
  return entityExtractor.extractLeaveDetails(message);
}

// Helper function to process leave request
async function processLeaveRequest(details: { 
  startDate: string | null, 
  endDate: string | null, 
  leaveType: string | null, 
  reason: string | null, 
  employeeName: string | null 
}, userEmail?: string): Promise<any> {
  if (!details.startDate || !details.leaveType) {
    throw new Error('Missing required fields');
  }
  
  const employeeName = details.employeeName || 'Current User';
  const endDate = details.endDate || details.startDate;
  
  // Check if the leave date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
  const requestDate = new Date(details.startDate);
  requestDate.setHours(0, 0, 0, 0);
  
  console.log('🔍 Date validation:', {
    requestDate: requestDate.toISOString(),
    today: today.toISOString(),
    isPast: requestDate < today,
    startDate: details.startDate
  });
  
  if (requestDate < today) {
    // Past date - return error for backdated application
    console.log('❌ Rejecting past date request');
    return {
      success: false,
      isPastDate: true,
      requestedDate: details.startDate,
      message: 'Cannot apply for leave on past dates'
    };
  }
  
  // Check for existing leave overlap
  const overlapCheck = await salesforceService.checkLeaveOverlap(
    employeeName,
    details.startDate,
    endDate
  );
  
  if (overlapCheck.hasOverlap) {
    // Return overlap information instead of creating
    return {
      success: false,
      hasOverlap: true,
      overlappingLeaves: overlapCheck.overlappingLeaves
    };
  }
  
  // No overlap, proceed with creating the leave
  console.log('🔍 Creating leave record with email:', userEmail);
  const recordData = {
    employeeName: employeeName,
    leaveType: details.leaveType,
    startDate: details.startDate,
    endDate: endDate,
    reason: details.reason || 'Personal',
    employeeEmail: userEmail  // Include email for Salesforce notifications
  };
  console.log('📦 Record data being sent:', JSON.stringify(recordData, null, 2));
  
  return await salesforceService.createLeaveRecord(recordData);
}

export const chatController = async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('💬 Chat request:', message);

    const sessionId = getSessionId(req);
    const sessionContext = contextManager.getContext(sessionId);
    const lowerMessage = message.toLowerCase();
    let response = '';

    // Add to conversation history
    contextManager.addToHistory(sessionId, message, 'unknown');

    // First-time user: Ask for email if not already collected
    if (!contextManager.hasUserEmail(sessionId) && !contextManager.isAwaitingEmail(sessionId)) {
      // Check if this message contains an email
      const email = entityExtractor.extractEmail(message);
      
      if (email) {
        // Email found in message, store it
        contextManager.setUserEmail(sessionId, email);
        console.log('✅ Email stored for session:', email);
        
        response = `✅ Thank you! Your email (${email}) has been saved.

You'll receive notifications at this email for all your leave requests.

Now, how can I help you today?
• Apply for leave
• Request WFH
• Check leave balance
• View leave policy`;
        
        return res.json({ 
          reply: response,
          intent: 'email_collected',
          timestamp: new Date().toISOString()
        });
      } else {
        // No email found - ask for it ALWAYS before processing any request
        contextManager.setAwaitingEmail(sessionId);
        
        response = `👋 Welcome to the HR Assistant!

To get started and ensure you receive email notifications for your requests, please provide your email address.

For example: "my.name@winfomi.com"`;
        
        return res.json({ 
          reply: response,
          intent: 'request_email',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Check if user is responding with email
    if (contextManager.isAwaitingEmail(sessionId)) {
      const email = entityExtractor.extractEmail(message);
      
      if (email) {
        contextManager.setUserEmail(sessionId, email);
        console.log('✅ Email stored for session:', email);
        
        response = `✅ Perfect! Your email (${email}) has been saved.

You'll receive notifications at this email for all your leave requests.

How can I help you today?
• Apply for leave
• Request WFH
• Check leave balance
• View leave policy`;
        
        return res.json({ 
          reply: response,
          intent: 'email_collected',
          timestamp: new Date().toISOString()
        });
      } else {
        response = `❌ I couldn't find a valid email address in your message.

Please provide your email in this format: name@company.com`;
        
        return res.json({ 
          reply: response,
          intent: 'request_email',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check if user is responding to confirmation
    if (contextManager.isAwaitingConfirmation(sessionId)) {
      const confirmation = entityExtractor.extractConfirmation(message);
      const pending = contextManager.getPendingConfirmation(sessionId);
      
      if (confirmation === 'yes' && pending) {
        // User confirmed - now create the record
        contextManager.clearPendingConfirmation(sessionId);
        
        if (pending.type === 'leave') {
          try {
            const leaveResult = await processLeaveRequest(pending.details, contextManager.getUserEmail(sessionId));
            
            if (leaveResult.isPastDate) {
              response = `❌ **Cannot create leave request for past date**

You're trying to apply for leave on **${leaveResult.requestedDate}**, which is in the past (today is ${new Date().toISOString().split('T')[0]}).

📋 **Policy for Backdated Leave:**
According to company policy, leave applications must be submitted in advance. For emergency situations where you were unable to apply beforehand:

• **Sick Leave**: Must be applied within 24 hours with a valid reason
• **Other Leave Types**: Require manager pre-approval before the absence

**What you can do:**
• If this was an emergency sick leave, contact your manager directly to explain the situation
• Your manager can manually approve retrospective leave through the HR system
• For future leave, please apply at least 2 days in advance

Need help with something else?`;
            } else if (leaveResult.hasOverlap) {
              const overlapping = leaveResult.overlappingLeaves[0];
              contextManager.saveLeaveConflict(sessionId, {
                existingLeave: overlapping,
                requestedLeave: pending.details
              });
              
              response = `⚠️ **Cannot create leave request**

You already have ${overlapping.status.toLowerCase()} leave from **${overlapping.startDate}** to **${overlapping.endDate}**, which includes ${pending.details.startDate}. 

📋 **Existing Leave Details:**
• Leave ID: ${overlapping.id}
• Type: ${overlapping.leaveType}
• Dates: ${overlapping.startDate} to ${overlapping.endDate}
• Reason: ${overlapping.reason}
• Status: ${overlapping.status}

**What would you like to do?**
• Type "modify" to change the existing leave dates
• Type "cancel existing" to cancel it and create a new one
• Type "details" to see more information about the existing leave`;
            } else {
              // Success!
              contextManager.saveLastRequest(sessionId, {
                type: 'leave',
                leaveType: pending.details.leaveType!,
                startDate: pending.details.startDate!,
                endDate: pending.details.endDate ?? undefined,
                reason: pending.details.reason ?? undefined,
                recordId: leaveResult.id
              });
              
              response = `✅ Leave request created successfully!

📋 Summary:
• Request ID: ${leaveResult.id}
• Employee: ${pending.details.employeeName || 'You'}
• Type: ${pending.details.leaveType}
• Date: ${pending.details.startDate}${pending.details.endDate && pending.details.endDate !== pending.details.startDate ? ' to ' + pending.details.endDate : ''}
• Reason: ${pending.details.reason}
• Status: Pending Approval

Your manager will review this request shortly. You'll receive an email notification once it's processed.`;
              
              return res.json({ 
                reply: response,
                intent: 'leave_created',
                showActionButtons: true,
                recordId: leaveResult.id,
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Leave request error:', error);
            response = `❌ Failed to submit leave request. Please try again or contact support.`;
            return res.json({ 
              reply: response,
              intent: 'error',
              timestamp: new Date().toISOString()
            });
          }
        } else if (pending.type === 'wfh') {
          // Similar logic for WFH
          try {
            const wfhResult = await salesforceService.createWfhRecord(pending.details);
            contextManager.saveLastRequest(sessionId, {
              type: 'wfh',
              date: pending.details.date,
              reason: pending.details.reason,
              recordId: wfhResult.id
            });
            
            response = `✅ WFH request created successfully!

📋 Summary:
• Request ID: ${wfhResult.id}
• Date: ${pending.details.date}
• Reason: ${pending.details.reason}
• Status: Pending Approval

Your manager will review this request shortly.`;
            
            return res.json({ 
              reply: response,
              intent: 'wfh_created',
              showActionButtons: true,
              recordId: wfhResult.id,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('WFH request error:', error);
            response = `❌ Failed to submit WFH request. Please try again or contact support.`;
            return res.json({ 
              reply: response,
              intent: 'error',
              timestamp: new Date().toISOString()
            });
          }
        }
      } else if (confirmation === 'no') {
        // User cancelled
        contextManager.clearPendingConfirmation(sessionId);
        response = `❌ Request cancelled. No record was created.

Would you like to:
• Submit a different request?
• Check your leave balance?
• View leave policy?`;
        
        return res.json({ 
          reply: response,
          intent: 'confirmation_no',
          timestamp: new Date().toISOString()
        });
      } else {
        // Unclear response
        response = `I didn't understand your response. 

Please reply with:
• "Yes" or "Confirm" to submit the request
• "No" or "Cancel" to cancel the request`;
        
        return res.json({ 
          reply: response,
          intent: 'confirmation_unclear',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check if user wants to edit/correct previous request
    if (entityExtractor.isEditRequest(message) && contextManager.getLastRequest(sessionId)) {
      const lastReq = contextManager.getLastRequest(sessionId)!;
      
      if (lastReq.type === 'leave') {
        // Check if user is providing new complete details in the edit message
        const newDetails = extractLeaveDetails(message);
        
        if (newDetails.startDate && newDetails.leaveType) {
        // User provided complete new details - show confirmation
        contextManager.clearLastRequest(sessionId);
        contextManager.setPendingConfirmation(sessionId, 'leave', newDetails);
        
        response = `📋 **Please confirm your UPDATED leave request:**

**Previous Details:**
• Type: ${lastReq.leaveType}
• Date: ${lastReq.startDate}${lastReq.endDate && lastReq.endDate !== lastReq.startDate ? ' to ' + lastReq.endDate : ''}
• Reason: ${lastReq.reason}

**New Details:**
• Type: ${newDetails.leaveType}
• Date: ${newDetails.startDate}${newDetails.endDate && newDetails.endDate !== newDetails.startDate ? ' to ' + newDetails.endDate : ''}
• Reason: ${newDetails.reason || 'Personal'}

Is this correct?
• Reply "Yes" or "Confirm" to update
• Reply "No" or "Cancel" to keep the original`;
        
        res.json({ 
          reply: response,
          intent: 'confirm_edit',
          timestamp: new Date().toISOString()
        });
        return;
        }
      } else if (lastReq.type === 'wfh') {
        // Check if user is providing new complete details for WFH
        const newDetails = entityExtractor.extractWfhDetails(message);
        
        if (newDetails.date) {
          // User provided complete WFH details
          contextManager.clearLastRequest(sessionId);
          contextManager.setPendingConfirmation(sessionId, 'wfh', newDetails);
        
        response = `📋 **Please confirm your UPDATED WFH request:**

**Previous Details:**
• Date: ${lastReq.date}
• Reason: ${lastReq.reason}

**New Details:**
• Date: ${newDetails.date}
• Reason: ${newDetails.reason || 'Personal'}

Is this correct?
• Reply "Yes" or "Confirm" to update
• Reply "No" or "Cancel" to keep the original`;
        
          res.json({ 
            reply: response,
            intent: 'confirm_edit',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
      
      // If we get here, ask for complete new details
      response = `✏️ Got it! Let's update your ${lastReq.type} request.

**Current Details:**
${lastReq.type === 'wfh' ? `• Date: ${lastReq.date}
• Reason: ${lastReq.reason}` : `• Type: ${lastReq.leaveType}
• Date: ${lastReq.startDate}${lastReq.endDate && lastReq.endDate !== lastReq.startDate ? ' to ' + lastReq.endDate : ''}
• Reason: ${lastReq.reason}`}

**You can update any of these details:**
• Change the type (Annual, Sick, Casual, etc.)
• Change the date/dates
• Change the reason

Please provide the complete NEW information. For example:
${lastReq.type === 'wfh' ? 
  '"WFH on 15.12.2025 for personal appointment"' : 
  '"Casual leave on 15.12.2025 for family event"'}`;
      
      res.json({ 
        reply: response,
        intent: 'edit_request',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if we're in a follow-up conversation (awaiting more leave details)
    const awaitingLeaveDetails = contextManager.getAwaitingLeaveDetails(sessionId);
    if (awaitingLeaveDetails) {
      
      // Check if user is providing clarification like "this month", "december", etc.
      if (lowerMessage.includes('this month') || lowerMessage.includes('next month') || 
          lowerMessage.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i)) {
        
        // Construct clarified message with stored context
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        let clarifiedDate = '';
        
        if (lowerMessage.includes('this month')) {
          clarifiedDate = `${awaitingLeaveDetails.partialDate} ${new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' })} ${currentYear}`;
        } else if (lowerMessage.includes('next month')) {
          const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
          const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
          clarifiedDate = `${awaitingLeaveDetails.partialDate} ${new Date(nextYear, nextMonth - 1).toLocaleString('default', { month: 'long' })} ${nextYear}`;
        } else {
          // Extract month name from message
          const monthMatch = message.match(/(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)/i);
          if (monthMatch) {
            clarifiedDate = `${awaitingLeaveDetails.partialDate} ${monthMatch[1]} ${currentYear}`;
          }
        }
        
        // Now process the clarified date
        response = `📝 Got it! You want leave on **${clarifiedDate}**.

Now please provide:
1. **Leave Type**: Annual, Sick, Casual, Maternity, or Paternity
2. **Reason**: Brief description

Example: "Annual leave for family vacation" or "Sick leave for medical appointment"`;
        
        // Update context with clarified date
        contextManager.setAwaitingLeaveDetails(sessionId, {
          ...awaitingLeaveDetails,
          clarifiedDate
        });
        
        res.json({ 
          reply: response,
          intent: 'clarify_leave_date',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Check if user is now providing leave type and reason
      const leaveTypeMatch = message.match(/\b(annual|sick|casual|maternity|paternity)\b/i);
      if (leaveTypeMatch && awaitingLeaveDetails.clarifiedDate) {
        // User has provided type and we have the date - try to process
        const fullMessage = `${leaveTypeMatch[1]} leave on ${awaitingLeaveDetails.clarifiedDate} ${message.replace(leaveTypeMatch[0], '')}`;
        const leaveDetails = extractLeaveDetails(fullMessage);
        
        if (leaveDetails.startDate && leaveDetails.leaveType) {
          // We have enough to show confirmation
          contextManager.clearAwaitingLeaveDetails(sessionId);
          
          // Save to pending confirmation instead of creating immediately
          contextManager.setPendingConfirmation(sessionId, 'leave', leaveDetails);
          
          response = `📋 **Please confirm your leave request:**

• **Type**: ${leaveDetails.leaveType}
• **Date**: ${leaveDetails.startDate}${leaveDetails.endDate && leaveDetails.endDate !== leaveDetails.startDate ? ' to ' + leaveDetails.endDate : ''}
• **Reason**: ${leaveDetails.reason || 'Personal'}`;
          
          res.json({ 
            reply: response,
            intent: 'confirm_leave',
            showButtons: true,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
    }

    // Check if user mentions existing/conflicting leave
    const hasConflictMention = lowerMessage.includes('already have') || 
                              lowerMessage.includes('have leave') || 
                              lowerMessage.includes('existing leave') ||
                              lowerMessage.includes('that week') ||
                              lowerMessage.includes('same week');

    // Detect intent using enhanced AI service
    const intent = aiService.detectIntent(message);
    
    // Update history with detected intent
    const history = contextManager.getHistory(sessionId);
    contextManager.addToHistory(sessionId, message, intent);

    switch (intent) {
      case 'apply_leave':
        // Check if user is mentioning a conflict
        if (hasConflictMention) {
          // Save partial information from the message
          const partialDetails = extractLeaveDetails(message);
          contextManager.setAwaitingLeaveDetails(sessionId, {
            partialDate: message.match(/\d{1,2}(th|st|nd|rd)?/)?.[0] || null,
            hasConflict: true
          });
          
          response = `⚠️ I understand you mentioned having existing leave that week. Let me help you check that.

To verify and process your request for the 20th, please provide:
1. **Complete Date**: Which month and year is the 20th? (e.g., "20th December", "January 20th", or "20-12-2025")
2. **Leave Type**: Annual, Sick, Casual, Maternity, or Paternity
3. **Reason**: Brief description

Example: "Annual leave on 20th December 2025 for family event"

💡 **Note**: I'll check for any existing leave and let you know if there's an overlap before creating a new request.`;
        } else {
          // Try to extract leave details from the message
          const leaveDetails = extractLeaveDetails(message);
        
          if (leaveDetails.startDate && leaveDetails.leaveType && leaveDetails.reason) {
            // We have enough info - show confirmation instead of creating immediately
            contextManager.setPendingConfirmation(sessionId, 'leave', leaveDetails);
            
            response = `📋 **Please confirm your leave request:**

• **Type**: ${leaveDetails.leaveType}
• **Date**: ${leaveDetails.startDate}${leaveDetails.endDate && leaveDetails.endDate !== leaveDetails.startDate ? ' to ' + leaveDetails.endDate : ''}
• **Reason**: ${leaveDetails.reason || 'Personal'}`;
            
            res.json({ 
              reply: response,
              intent: 'confirm_leave',
              showButtons: true,
              timestamp: new Date().toISOString()
            });
            return;
          } else if (leaveDetails.startDate && leaveDetails.leaveType) {
          // We have date and type but need reason
          response = `📝 I understand you want ${leaveDetails.leaveType.toLowerCase()} leave on ${leaveDetails.startDate}. Could you please tell me the reason? For example: "for cousin's wedding" or "for medical appointment"`;
        } else if (leaveDetails.startDate && leaveDetails.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // We have a valid date but need type and reason
          response = `📝 I understand you want leave on ${leaveDetails.startDate}. Please specify:
1. **Leave Type**: Annual, Sick, Casual, Maternity, or Paternity
2. **Reason**: Brief description

Example: "Annual leave for family vacation"`;
        } else {
          // Need more info or date parsing failed
          const hasDateHint = message.match(/\d{1,2}(th|st|nd|rd)?/);
          if (hasDateHint) {
            response = `📝 I noticed you mentioned a date, but I need more details to process your leave request:

1. **Complete Date**: Please specify the full date (e.g., "20th December", "December 20", or "20-12-2025")
2. **Leave Type**: Annual, Sick, Casual, Maternity, or Paternity
3. **Reason**: Brief description

Example: "Annual leave on 20th December 2025 for family event"`;
          } else {
            response = `🏖️ I can help you apply for leave! Please provide the following details:

1. **Leave Type** (Annual, Sick, Casual, Maternity, Paternity)
2. **Date** (when you need leave)
3. **Reason** (brief description)

Example: "Annual leave on December 25 for Christmas" or "Sick leave tomorrow for doctor appointment"`;
          }
        }
        }
        break;

      case 'apply_wfh':
        // Try to extract WFH details from the message
        const wfhDetails = extractWfhDetails(message);
        
        if (wfhDetails.date && wfhDetails.reason) {
          // We have enough info, process the WFH request
          try {
            const wfhResult = await processWfhRequest(wfhDetails);
            
            // Save context for editing
            contextManager.saveLastRequest(sessionId, {
              type: 'wfh',
              date: wfhDetails.date!,
              reason: wfhDetails.reason!,
              recordId: wfhResult.id
            });
            
            response = `✅ Work From Home request submitted successfully!

📋 Summary:
• Date: ${wfhDetails.date}
• Reason: ${wfhDetails.reason}
• Employee: ${wfhDetails.employeeName || 'You'}
• Status: Approved (Auto-approved)

Your WFH request has been recorded. Please ensure you have proper internet connectivity and VPN access.

✏️ Need to make changes? Just say "edit" or "change date" to update any details.`;
          } catch (error) {
            response = `❌ Failed to submit WFH request. Please try again or contact support.`;
          }
        } else if (wfhDetails.date) {
          // We have the date but need reason
          response = `🏠 I understand you want to work from home on ${wfhDetails.date}. Could you please tell me the reason? For example: "for doctor's appointment" or "personal work"`;
        } else if (wfhDetails.reason) {
          // We have reason but need date
          response = `🏠 I understand your reason: "${wfhDetails.reason}". Which date would you like to work from home? Please specify the date (e.g., "tomorrow", "December 25", "25th Dec").`;
        } else {
          // Need more info
          response = `🏠 I can help you apply for Work From Home! Please provide:
        
1. **Date** (when you want to WFH)
2. **Reason** (brief description)

Example: "WFH tomorrow for doctor's appointment" or "work from home on December 25 for Christmas"`;
        }
        break;

      case 'holiday_list':
        response = `🎉 **Winfomi Technologies Holiday Calendar 2024**

**Mandatory Holidays:**
• Jan 26 - Republic Day
• Mar 08 - Holi  
• Mar 29 - Good Friday
• Apr 11 - Eid ul-Fitr
• Aug 15 - Independence Day
• Sep 02 - Ganesh Chaturthi
• Oct 02 - Gandhi Jayanti
• Oct 12 - Dussehra
• Nov 01 - Diwali
• Dec 25 - Christmas Day

**Optional Holidays (Choose 2):**
• Aug 19 - Raksha Bandhan
• Nov 15 - Guru Nanak Jayanti

**Total:** 12 holidays | **Working Days:** Mon-Fri | **Weekends:** Sat-Sun`;
        break;

      case 'leave_policy':
        response = `📋 **Winfomi Leave Policy Summary**

**Annual Leave:** 21 days (1.75/month) | Carry forward: Max 5 days
**Sick Leave:** 12 days | Medical cert required for 3+ days  
**Casual Leave:** 12 days | 1 day advance notice required
**Maternity Leave:** 180 days (26 weeks full pay)
**Paternity Leave:** 15 days (after 6 months service)

**Application Process:**
• Minimum 2 days advance notice
• Manager approval required
• Apply through People Portal or HR Agent
• Emergency: Apply within 24 hours

**Important Notes:**
• No leaves during first 3 months (probation)
• Public holidays between leaves count as leave days
• Half-day leaves available (0.5 increments)`;
        break;

      case 'wfh_policy':
        response = `🏠 **Winfomi Work From Home (WFH) Policy**

**Eligibility:**
• Available to all permanent employees after probation
• Manager approval required
• Maximum 2 WFH days per week (unless special circumstances)

**Application Process:**
• Apply at least 1 day in advance through HR Agent or People Portal
• Emergency WFH: Notify manager and apply within same day
• Approval is auto-granted for most cases unless manager overrides

**Requirements:**
• Stable internet connection (minimum 10 Mbps)
• VPN access for secure connectivity
• Availability during working hours (9 AM - 6 PM)
• Respond to calls/messages within 15 minutes

**Not Allowed:**
• WFH during team meetings or client presentations (unless pre-approved)
• WFH on month-end/quarter-end days (for relevant departments)

**Best Practices:**
• Update calendar with WFH status
• Join daily standups via video call
• Maintain same productivity as office days`;
        break;

      default:
        // Use AI for general queries with conversation context
        const conversationHistory = contextManager.getHistory(sessionId, 3);
        response = await aiService.processMessage(message, { history: conversationHistory });
        break;
    }

    res.json({ 
      reply: response,
      intent: intent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat Controller Error:', error);
    res.status(500).json({ 
      error: 'I apologize, I encountered an error processing your request. Please try again.'
    });
  }
};

export default chatController;