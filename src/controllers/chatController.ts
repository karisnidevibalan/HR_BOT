import { Request, Response } from 'express';
import { AiService } from '../services/aiService';
import { SalesforceService } from '../services/salesforceService';
import dateParser from '../services/dateParser';
import entityExtractor from '../utils/entityExtractor';
import contextManager from '../utils/contextManager';

const aiService = new AiService();
const salesforceService = new SalesforceService();

function getSessionId(req: Request): string {
  return req.headers['x-session-id'] as string || 'default-session';
}

const ALLOW_PAST_DATES = process.env.ALLOW_BACKDATED_LEAVE === 'true';
const DEFAULT_EMPLOYEE_NAME = 'Current User';

function extractLeaveType(message: string): string | null {
  const lower = message.toLowerCase();
  const keywordMap: Record<string, string> = {
    annual: 'ANNUAL',
    vacation: 'ANNUAL',
    holiday: 'ANNUAL',
    travel: 'ANNUAL',
    sick: 'SICK',
    medical: 'SICK',
    fever: 'SICK',
    flu: 'SICK',
    ill: 'SICK',
    casual: 'CASUAL',
    maternity: 'MATERNITY',
    pregnancy: 'MATERNITY',
    pregnant: 'MATERNITY',
    paternity: 'PATERNITY'
  };

  for (const [keyword, type] of Object.entries(keywordMap)) {
    if (lower.includes(keyword)) {
      return type;
    }
  }

  if (lower.match(/\b(baby|newborn|fatherhood)\b/)) {
    return 'PATERNITY';
  }

  if (lower.match(/\b(wedding|marriage|family event|personal)\b/)) {
    return 'CASUAL';
  }

  return null;
}

function cleanReason(reason: string): string | null {
  const cleaned = reason
    .replace(/\b(apply|request|requesting|need|want|for|because of|because)\b/gi, '')
    .replace(/\bleave\b/gi, '')
    .replace(/\bon\b/gi, '')
    .replace(/\bfrom\b/gi, '')
    .replace(/\bthe\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 3) {
    return null;
  }

  return cleaned;
}

function extractReason(message: string): string | null {
  const becauseMatch = message.match(/because\s+(.+?)(?:[.?!]|$)/i);
  if (becauseMatch) {
    const cleaned = cleanReason(becauseMatch[1]);
    if (cleaned) {
      return cleaned;
    }
  }

  const forMatch = message.match(/for\s+(.+?)(?:\s+on|\s+from|\s+starting|\s+beginning|[.?!]|$)/i);
  if (forMatch) {
    const cleaned = cleanReason(forMatch[1]);
    if (cleaned) {
      return cleaned;
    }
  }

  const lower = message.toLowerCase();
  if (lower.match(/\b(sick|fever|flu|medical|doctor|clinic|hospital)\b/)) {
    return 'Medical reasons';
  }
  if (lower.match(/\b(wedding|marriage|ceremony|family)\b/)) {
    return 'Family event';
  }
  if (lower.match(/\b(travel|vacation|holiday|trip)\b/)) {
    return 'Travel';
  }

  return null;
}

function calculateWorkingDays(startDate: string | null, endDate: string | null, isHalfDay = false): number | null {
  if (!startDate) {
    return null;
  }

  const effectiveEnd = endDate || startDate;
  const total = dateParser.calculateInclusiveDays(startDate, effectiveEnd, isHalfDay);
  return total > 0 ? total : null;
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

// Helper function to extract leave details using DateParser service
function extractLeaveDetails(message: string): {
  startDate: string | null,
  endDate: string | null,
  leaveType: string | null,
  reason: string | null,
  employeeName: string | null,
  durationDays?: number | null,
  isHalfDay?: boolean,
  errors?: string[]
} {
  const parsedDates = dateParser.parseDates(message);
  const durationInfo = dateParser.parseDuration(message);
  const leaveType = extractLeaveType(message);
  const reason = extractReason(message);

  let startDate = parsedDates.startDate;
  let endDate = parsedDates.endDate ?? parsedDates.startDate;

  if (startDate && durationInfo.durationDays && (!endDate || durationInfo.hasExplicitDuration)) {
    endDate = durationInfo.isHalfDay
      ? startDate
      : dateParser.projectEndDate(startDate, durationInfo.durationDays);
  }

  if (startDate && !endDate) {
    endDate = startDate;
  }

  const errors = [...parsedDates.errors];
  if (startDate && endDate) {
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime < startTime) {
      errors.push('End date cannot be earlier than start date.');
    }
  }

  const durationDays = calculateWorkingDays(startDate ?? null, endDate ?? null, durationInfo.isHalfDay || false) ?? durationInfo.durationDays ?? null;

  return {
    startDate: startDate ?? null,
    endDate: endDate ?? startDate ?? null,
    leaveType,
    reason,
    employeeName: DEFAULT_EMPLOYEE_NAME,
    durationDays,
    isHalfDay: durationInfo.isHalfDay || durationDays === 0.5,
    errors: errors.length ? Array.from(new Set(errors)) : undefined
  };
}

function calculateInclusiveDays(startDate: string, endDate?: string | null): number {
  const effectiveEnd = endDate ?? startDate;
  return dateParser.calculateInclusiveDays(startDate, effectiveEnd);
}

function applyLeaveDefaults(details: { 
  startDate: string | null,
  endDate: string | null,
  leaveType: string | null,
  reason: string | null,
  employeeName: string | null,
  durationDays?: number | null,
  isHalfDay?: boolean,
  errors?: string[]
}) {
  if (details.startDate) {
    if (details.isHalfDay) {
      details.endDate = details.startDate;
      details.durationDays = 0.5;
    } else if (details.durationDays && details.durationDays > 0) {
      if (!details.endDate || details.endDate === details.startDate) {
        details.endDate = dateParser.projectEndDate(details.startDate, details.durationDays);
      }
    } else if (details.endDate) {
      details.durationDays = calculateInclusiveDays(details.startDate, details.endDate);
    } else {
      details.endDate = details.startDate;
      details.durationDays = 1;
    }
  }

  if (!details.leaveType && details.startDate) {
    details.leaveType = 'CASUAL';
  }

  if (!details.reason || details.reason.trim().length === 0) {
    details.reason = 'Personal';
  }

  if (!details.employeeName) {
    details.employeeName = DEFAULT_EMPLOYEE_NAME;
  }

  return details;
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
      message: 'Leave date is in the past'
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
    employeeEmail: userEmail
  };
  console.log('📦 Record data being sent:', JSON.stringify(recordData, null, 2));

  return await salesforceService.createLeaveRecord(recordData);
}

function getRequestedLeaveDays(details: { startDate?: string | null; endDate?: string | null; durationDays?: number | null; isHalfDay?: boolean | null }): number | null {
  if (typeof details.durationDays === 'number' && details.durationDays > 0) {
    return details.durationDays;
  }

  if (details.startDate) {
    const totalDays = dateParser.calculateInclusiveDays(details.startDate, details.endDate ?? details.startDate, Boolean(details.isHalfDay));
    return totalDays > 0 ? totalDays : null;
  }

  return null;
}

async function enforceLeaveBalance(
  sessionId: string,
  details: { startDate?: string | null; endDate?: string | null; leaveType?: string | null; durationDays?: number | null },
  res: Response
): Promise<boolean> {
  const requestedDays = getRequestedLeaveDays(details);
  if (!requestedDays || requestedDays <= 0 || !details.leaveType) {
    return false;
  }

  try {
    const userEmail = contextManager.getUserEmail(sessionId);
    const balance = await salesforceService.checkLeaveBalance(userEmail, details.leaveType, requestedDays);

    if (balance && balance.isAvailable === false) {
      const formatDays = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(1));
      const response = `⚠️ Insufficient leave balance.

  • Requested: ${formatDays(requestedDays)} day${requestedDays === 1 ? '' : 's'}
  • Available: ${formatDays(balance.remaining)} day${balance.remaining === 1 ? '' : 's'}

Please reduce the duration or choose a different leave type.`;

      res.json({
        reply: response,
        intent: 'leave_balance_insufficient',
        timestamp: new Date().toISOString()
      });
      return true;
    }
  } catch (error) {
    console.error('Leave balance check failed:', error);
  }

  return false;
}

async function handleLeaveEditRequest(
  sessionId: string,
  pending: { details: any },
  editDetails: any,
  message: string,
  res: Response
): Promise<boolean> {
  const detailsFromForm = editDetails && typeof editDetails === 'object' ? editDetails : null;
  let newDetails: any = null;

  if (detailsFromForm) {
    const updatedStart = detailsFromForm.startDate || pending.details.startDate;
    const updatedEnd = detailsFromForm.endDate || updatedStart || pending.details.endDate;
    newDetails = {
      ...pending.details,
      leaveType: detailsFromForm.leaveType || pending.details.leaveType,
      startDate: updatedStart,
      endDate: updatedEnd,
      reason: detailsFromForm.reason ?? pending.details.reason ?? 'Personal',
      employeeName: pending.details.employeeName || 'You'
    };
  } else {
    newDetails = extractLeaveDetails(message);
    if (newDetails) {
      newDetails = {
        ...pending.details,
        ...newDetails
      };
    }
  }

  if (newDetails) {
    newDetails = applyLeaveDefaults(newDetails);
  }

  if (newDetails?.errors?.length) {
    const primaryError = newDetails.errors[0];
    const errorMessage = primaryError.includes('End date cannot be earlier than start date')
      ? '❌ End date cannot be earlier than start date. Please adjust your dates.'
      : `❌ ${primaryError}`;

    res.json({
      reply: `${errorMessage}

Please provide corrected dates to continue editing your leave request.`,
      intent: 'validation_error',
      timestamp: new Date().toISOString()
    });
    return true;
  }

  if (newDetails && newDetails.startDate && newDetails.leaveType) {
    newDetails.reason = newDetails.reason || 'Personal';
    if (await enforceLeaveBalance(sessionId, newDetails, res)) {
      return true;
    }
    const { errors, ...pendingDetails } = newDetails;
    contextManager.setPendingConfirmation(sessionId, 'leave', pendingDetails);

    const reply = `📋 **Please confirm your UPDATED leave request:**

• **Type**: ${pendingDetails.leaveType}
• **Date**: ${pendingDetails.startDate}${pendingDetails.endDate && pendingDetails.endDate !== pendingDetails.startDate ? ' to ' + pendingDetails.endDate : ''}
• **Reason**: ${pendingDetails.reason}

Tap a button below when you're ready.`;

    res.json({
      reply,
      intent: 'confirm_leave',
      showButtons: true,
      pendingRequest: { type: 'leave', details: pendingDetails },
      timestamp: new Date().toISOString()
    });
    return true;
  }

  const fallbackReply = `✏️ Got it! Let's update your leave request.

**Current Details:**
• Type: ${pending.details.leaveType}
• Date: ${pending.details.startDate}${pending.details.endDate && pending.details.endDate !== pending.details.startDate ? ' to ' + pending.details.endDate : ''}
• Reason: ${pending.details.reason || 'Personal'}

**You can update any of these details:**
• Change the type (Annual, Sick, Casual)
• Change the date
• Change the reason

Please provide the complete NEW information. For example:
"Casual leave on 20.12.2025 for family event"`;

  res.json({
    reply: fallbackReply,
    intent: 'edit_request',
    timestamp: new Date().toISOString()
  });
  return true;
}

function handleWfhEditRequest(
  sessionId: string,
  pending: { details: any },
  editDetails: any,
  message: string,
  res: Response
): boolean {
  const detailsFromForm = editDetails && typeof editDetails === 'object' ? editDetails : null;
  let newDetails: any = null;

  if (detailsFromForm) {
    newDetails = {
      ...pending.details,
      date: detailsFromForm.date || pending.details.date,
      reason: detailsFromForm.reason ?? pending.details.reason ?? 'Personal',
      employeeName: pending.details.employeeName || 'You'
    };
  } else {
    newDetails = extractWfhDetails(message);
    if (newDetails) {
      newDetails = {
        ...pending.details,
        ...newDetails
      };
    }
  }

  if (newDetails && newDetails.date) {
    newDetails.reason = newDetails.reason || 'Personal';
    contextManager.setPendingConfirmation(sessionId, 'wfh', newDetails);

    const reply = `📋 **Please confirm your UPDATED WFH request:**

• **Date**: ${newDetails.date}
• **Reason**: ${newDetails.reason}

Tap a button below when you're ready.`;

    res.json({
      reply,
      intent: 'confirm_wfh',
      showButtons: true,
      pendingRequest: { type: 'wfh', details: newDetails },
      timestamp: new Date().toISOString()
    });
    return true;
  }

  const fallbackReply = `✏️ Got it! Let's update your WFH request.

**Current Details:**
• Date: ${pending.details.date}
• Reason: ${pending.details.reason || 'Personal'}

Please provide the complete NEW information. For example:
"WFH on 20.12.2025 for doctor appointment"`;

  res.json({
    reply: fallbackReply,
    intent: 'edit_request',
    timestamp: new Date().toISOString()
  });
  return true;
}

export const chatController = async (req: Request, res: Response) => {
  try {
    const { message, context, editDetails, employeeEmail, confirmationAction, intentOverride } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('💬 Chat request:', message);

    const sessionId = getSessionId(req);

    if (typeof employeeEmail === 'string' && employeeEmail.includes('@') && !contextManager.hasUserEmail(sessionId)) {
      const trimmed = employeeEmail.trim();
      if (trimmed.length > 3) {
        contextManager.setUserEmail(sessionId, trimmed);
        console.log('✅ Email received from client payload:', trimmed);
      }
    }

    const normalizedConfirmationAction = typeof confirmationAction === 'string' ? confirmationAction.toLowerCase() : null;
    const normalizedIntentOverride = typeof intentOverride === 'string' ? intentOverride.toLowerCase() : null;
    const shouldSkipHistory = normalizedConfirmationAction === 'yes' || normalizedConfirmationAction === 'no';

    const lowerMessage = message.toLowerCase();
    let response = '';

    // Add to conversation history
    if (!shouldSkipHistory) {
      contextManager.addToHistory(sessionId, message, 'unknown');
    }

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
    if (typeof employeeEmail === 'string' && employeeEmail.includes('@') && !contextManager.hasUserEmail(sessionId)) {
      const trimmed = employeeEmail.trim();
      if (trimmed.length > 3) {
        contextManager.setUserEmail(sessionId, trimmed);
        console.log('✅ Email received from client payload:', trimmed);
      }
    }

    const pendingConfirmation = contextManager.getPendingConfirmation(sessionId);
    const confirmation = normalizedConfirmationAction || entityExtractor.extractConfirmation(message);

    if (!pendingConfirmation && confirmation) {
      const lastRequest = contextManager.getLastRequest(sessionId);

      if (confirmation === 'yes') {
        if (lastRequest) {
          if (lastRequest.type === 'leave') {
            return res.json({
              reply: `✅ Leave request created successfully!

Type: ${lastRequest.leaveType}
Date: ${lastRequest.startDate}${lastRequest.endDate && lastRequest.endDate !== lastRequest.startDate ? ' to ' + lastRequest.endDate : ''}
Reason: ${lastRequest.reason || 'Personal'}
Status: Pending Approval

Your manager has been notified and will review your request shortly.`,
              intent: 'no_pending_confirmation',
              timestamp: new Date().toISOString()
            });
          }

          if (lastRequest.type === 'wfh') {
            return res.json({
              reply: `✅ WFH request created successfully!

Date: ${lastRequest.date}
Reason: ${lastRequest.reason || 'Personal'}
Status: Pending Approval

Your manager has been notified and will review your request shortly.`,
              intent: 'no_pending_confirmation',
              timestamp: new Date().toISOString()
            });
          }

          return res.json({
            reply: `✅ All set! Your last request is already completed.`,
            intent: 'no_pending_confirmation',
            timestamp: new Date().toISOString()
          });
        }

        return res.json({
          reply: `✅ All set! There's nothing awaiting confirmation.`,
          intent: 'no_pending_confirmation',
          timestamp: new Date().toISOString()
        });
      }

      if (confirmation === 'no') {
        return res.json({
          reply: `ℹ️ Nothing was cancelled because there wasn't a pending request.`,
          intent: 'no_pending_confirmation',
          timestamp: new Date().toISOString()
        });
      }
    }

    if (pendingConfirmation) {
      const pending = pendingConfirmation;
      const isEditAction = normalizedIntentOverride === 'edit_leave' || normalizedIntentOverride === 'edit_wfh' || entityExtractor.isEditRequest(message);

      if (isEditAction && pending) {
        console.log('🔧 Edit request detected, pending type:', pending.type);

        if (pending.type === 'leave') {
          const handled = await handleLeaveEditRequest(sessionId, pending, editDetails, message, res);
          if (handled) {
            return;
          }
        } else if (pending.type === 'wfh') {
          if (handleWfhEditRequest(sessionId, pending, editDetails, message, res)) {
            return;
          }
        }
      }
      
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

Type: ${pending.details.leaveType}
Date: ${pending.details.startDate}${pending.details.endDate && pending.details.endDate !== pending.details.startDate ? ' to ' + pending.details.endDate : ''}
Reason: ${pending.details.reason}
Status: Pending Approval

Your manager has been notified and will review your request shortly.`;
              
              return res.json({ 
                reply: response,
                intent: 'leave_created',
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
            const userEmail = contextManager.getUserEmail(sessionId);
            const wfhPayload = {
              employeeName: pending.details.employeeName || DEFAULT_EMPLOYEE_NAME,
              date: pending.details.date,
              reason: pending.details.reason,
              employeeEmail: userEmail || null
            };

            const wfhResult = await salesforceService.createWfhRecord(wfhPayload);
            contextManager.saveLastRequest(sessionId, {
              type: 'wfh',
              date: pending.details.date,
              reason: pending.details.reason,
              recordId: wfhResult.id
            });
            
            response = `✅ WFH request created successfully!

Date: ${pending.details.date}
Reason: ${pending.details.reason}
Status: Pending Approval

Your manager has been notified and will review your request shortly.`;
            
            return res.json({ 
              reply: response,
              intent: 'wfh_created',
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
• "No" or "Cancel" to cancel the request
• "Edit" to make changes`;
        
        return res.json({ 
          reply: response,
          intent: 'confirmation_unclear',
          timestamp: new Date().toISOString()
        });
      }
    }

    if (!pendingConfirmation && (normalizedIntentOverride === 'edit_leave' || normalizedIntentOverride === 'edit_wfh')) {
      return res.json({
        reply: `ℹ️ There isn't any pending request to edit right now. Start a new request whenever you're ready.`,
        intent: 'no_pending_confirmation',
        timestamp: new Date().toISOString()
      });
    }

    // Edit handler for AFTER record is created (when lastRequest exists but no pending confirmation)
    if ((normalizedIntentOverride === 'edit_leave' || normalizedIntentOverride === 'edit_wfh' || entityExtractor.isEditRequest(message)) && contextManager.getLastRequest(sessionId) && !contextManager.isAwaitingConfirmation(sessionId)) {
      const lastReq = contextManager.getLastRequest(sessionId)!;
      
      response = `ℹ️ Your ${lastReq.type} request has already been submitted to Salesforce (ID: ${lastReq.recordId}).

To modify an already submitted request, please:
• Contact your manager directly
• Or you can create a new ${lastReq.type} request

Would you like to create a new ${lastReq.type} request?`;
      
      res.json({ 
        reply: response,
        intent: 'edit_after_creation',
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
        const leaveDetails = applyLeaveDefaults(extractLeaveDetails(fullMessage));
        
        if (leaveDetails.startDate && leaveDetails.leaveType) {
          // We have enough to show confirmation
          if (await enforceLeaveBalance(sessionId, leaveDetails, res)) {
            return;
          }
          contextManager.clearAwaitingLeaveDetails(sessionId);
          
          // Save to pending confirmation instead of creating immediately
          leaveDetails.reason = leaveDetails.reason || 'Personal';
          contextManager.setPendingConfirmation(sessionId, 'leave', leaveDetails);
          
          response = `📋 **Please confirm your leave request:**

• **Type**: ${leaveDetails.leaveType}
• **Date**: ${leaveDetails.startDate}${leaveDetails.endDate && leaveDetails.endDate !== leaveDetails.startDate ? ' to ' + leaveDetails.endDate : ''}
• **Reason**: ${leaveDetails.reason || 'Personal'}

Tap a button below when you're ready.`;
          
          res.json({ 
            reply: response,
            intent: 'confirm_leave',
            showButtons: true,
            pendingRequest: { type: 'leave', details: leaveDetails },
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
    }

    // Detect intent using enhanced AI service
    if (shouldSkipHistory) {
      return res.json({
        reply: response || `✅ All set! There's nothing awaiting confirmation.`,
        intent: 'confirmation_action',
        timestamp: new Date().toISOString()
      });
    }

    const intent = aiService.detectIntent(message);
    
    // Update history with detected intent
    contextManager.addToHistory(sessionId, message, intent);

    switch (intent) {
      case 'apply_leave': {
        const leaveDetailsRaw = extractLeaveDetails(message);
        const leaveDetails = applyLeaveDefaults({ ...leaveDetailsRaw });

        if (leaveDetails.errors && leaveDetails.errors.length) {
          const primaryError = leaveDetails.errors[0];
          const errorMessage = primaryError.includes('End date cannot be earlier than start date')
            ? '❌ End date cannot be earlier than start date. Please adjust your dates.'
            : `❌ ${primaryError}`;
          response = `${errorMessage}

Please correct the date and try again.`;
          break;
        }

        if (!leaveDetails.startDate) {
          response = `🗓️ I couldn't find a date in your request.

Please specify when the leave should start. Examples:
• "Casual leave on December 20"
• "Sick leave from 15th to 17th"`;
          break;
        }

        const employeeName = leaveDetails.employeeName || DEFAULT_EMPLOYEE_NAME;
        const startDate = leaveDetails.startDate;
        const endDate = leaveDetails.endDate ?? startDate;

        if (!ALLOW_PAST_DATES && dateParser.isPastDate(startDate)) {
          response = '❌ Cannot apply leave for past dates. Please choose a future date or contact your manager for assistance.';
          break;
        }

        leaveDetails.leaveType = leaveDetails.leaveType || 'CASUAL';
        leaveDetails.reason = leaveDetails.reason && leaveDetails.reason.trim().length > 0 ? leaveDetails.reason : 'Personal';

        const overlapCheck = await salesforceService.checkLeaveOverlap(employeeName, startDate, endDate);
        if (overlapCheck && overlapCheck.hasOverlap && overlapCheck.overlappingLeaves?.length) {
          const conflict = overlapCheck.overlappingLeaves[0];
          response = `⚠️ You already have ${conflict.status.toLowerCase()} ${conflict.leaveType} leave from ${conflict.startDate} to ${conflict.endDate}.

Please adjust your new request or update the existing leave first.`;
          break;
        }

        if (await enforceLeaveBalance(sessionId, leaveDetails, res)) {
          return;
        }

        const { errors, ...pendingDetails } = leaveDetails;
        const effectiveDuration = pendingDetails.durationDays ?? dateParser.calculateInclusiveDays(startDate, endDate, Boolean(pendingDetails.isHalfDay));
        const formattedDuration = Number.isFinite(effectiveDuration)
          ? (Number.isInteger(effectiveDuration) ? `${effectiveDuration}` : effectiveDuration.toFixed(1))
          : '1';
        const durationLabel = effectiveDuration === 0.5 ? 'Half day' : `${formattedDuration} day${effectiveDuration === 1 ? '' : 's'}`;

        contextManager.setPendingConfirmation(sessionId, 'leave', pendingDetails);

        response = `📋 **Please confirm your leave request:**

• **Type**: ${pendingDetails.leaveType}
• **Date**: ${startDate}${endDate && endDate !== startDate ? ' to ' + endDate : ''}
• **Duration**: ${durationLabel}
• **Reason**: ${pendingDetails.reason}

Select an option below: [Confirm] [Edit] [Cancel].`;

        res.json({
          reply: response,
          intent: 'confirm_leave',
          showButtons: true,
          pendingRequest: { type: 'leave', details: pendingDetails },
          timestamp: new Date().toISOString()
        });
        return;
      }
        break;

      case 'apply_wfh':
        // Try to extract WFH details from the message
        const wfhDetails = extractWfhDetails(message);
        
        if (wfhDetails.date && wfhDetails.reason) {
          // We have enough info - show confirmation instead of creating immediately
          wfhDetails.reason = wfhDetails.reason || 'Personal';
          contextManager.setPendingConfirmation(sessionId, 'wfh', wfhDetails);
          
          response = `📋 **Please confirm your WFH request:**

• **Date**: ${wfhDetails.date}
• **Reason**: ${wfhDetails.reason}

Tap a button below when you're ready.`;
          
          res.json({ 
            reply: response,
            intent: 'confirm_wfh',
            showButtons: true,
            pendingRequest: { type: 'wfh', details: wfhDetails },
            timestamp: new Date().toISOString()
          });
          return;
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
        // Before falling back to AI, try to recognize implicit leave/WFH details
        const fallbackLeaveDetails = applyLeaveDefaults(extractLeaveDetails(message));
        if (fallbackLeaveDetails.startDate && lowerMessage.includes('leave')) {
          if (await enforceLeaveBalance(sessionId, fallbackLeaveDetails, res)) {
            return;
          }
          contextManager.setPendingConfirmation(sessionId, 'leave', fallbackLeaveDetails);

          response = `📋 **Please confirm your leave request:**

• **Type**: ${fallbackLeaveDetails.leaveType}
• **Date**: ${fallbackLeaveDetails.startDate}${fallbackLeaveDetails.endDate && fallbackLeaveDetails.endDate !== fallbackLeaveDetails.startDate ? ' to ' + fallbackLeaveDetails.endDate : ''}
• **Reason**: ${fallbackLeaveDetails.reason || 'Personal'}

Tap a button below when you're ready.`;

          res.json({
            reply: response,
            intent: 'confirm_leave',
            showButtons: true,
            pendingRequest: { type: 'leave', details: fallbackLeaveDetails },
            timestamp: new Date().toISOString()
          });
          return;
        }

        const fallbackWfhDetails = extractWfhDetails(message);
        if (fallbackWfhDetails.date && lowerMessage.includes('wfh')) {
          fallbackWfhDetails.reason = fallbackWfhDetails.reason || 'Personal';
          contextManager.setPendingConfirmation(sessionId, 'wfh', fallbackWfhDetails);

          response = `📋 **Please confirm your WFH request:**

• **Date**: ${fallbackWfhDetails.date}
• **Reason**: ${fallbackWfhDetails.reason}

Tap a button below when you're ready.`;

          res.json({
            reply: response,
            intent: 'confirm_wfh',
            showButtons: true,
            pendingRequest: { type: 'wfh', details: fallbackWfhDetails },
            timestamp: new Date().toISOString()
          });
          return;
        }

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