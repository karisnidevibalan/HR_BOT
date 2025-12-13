const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Salesforce Integration
const { RealSalesforceService } = require('./real-salesforce-integration');
const salesforceService = new RealSalesforceService();

// Enhanced Date Parser
const dateParser = require('./date-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock data (for demo mode fallback)
const leavePolicy = {
  "companyName": "Winfomi Technologies",
  "leaveTypes": {
    "annual": { "name": "Annual Leave", "entitlement": 21 },
    "sick": { "name": "Sick Leave", "entitlement": 12 },
    "casual": { "name": "Casual Leave", "entitlement": 12 }
  }
};

const holidays = [
  { "date": "2024-01-26", "name": "Republic Day" },
  { "date": "2024-03-08", "name": "Holi" },
  { "date": "2024-08-15", "name": "Independence Day" },
  { "date": "2024-10-02", "name": "Gandhi Jayanti" },
  { "date": "2024-11-01", "name": "Diwali" },
  { "date": "2024-12-25", "name": "Christmas Day" }
];

// Mock Salesforce service
let mockDatabase = [];
let nextId = 1;

// Session management for confirmations
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      pendingConfirmation: null,
      awaitingReason: null
    });
  }
  return sessions.get(sessionId);
}

// Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, pendingLeaveDate, sessionId = 'default' } = req.body;
    console.log('💬 Chat request:', message);

    const session = getSession(sessionId);
    let response = '';
    const lowerMessage = message.toLowerCase();

    // Check if message has date info (used in multiple places)
    const hasDateInfo = /\b(tomorrow|today|\d{1,2}[\.\-/]\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec))\b/i.test(lowerMessage);

    // Handle confirmation responses
    if (session.pendingConfirmation) {
      const isYes = /\b(yes|confirm|correct|ok|yeah|yep|sure)\b/i.test(lowerMessage);
      const isNo = /\b(no|cancel|wrong|nope)\b/i.test(lowerMessage);

      if (isYes) {
        // User confirmed - now create the record
        const leaveData = session.pendingConfirmation;
        
        // Create record in Salesforce
        const sfResult = await salesforceService.createLeaveRecord(leaveData);
        
        if (!sfResult.success) {
          // Fallback to mock if Salesforce fails
          console.warn('⚠️ Salesforce failed, using mock database');
          const record = {
            id: `LR-${String(nextId).padStart(4, '0')}`,
            ...leaveData,
            status: 'Pending Approval',
            createdAt: new Date().toISOString()
          };
          nextId++;
          mockDatabase.push(record);
          sfResult.id = record.id;
        }

        console.log('✅ Leave record created:', sfResult.id);

        const formatDate = (isoDate) => {
          const d = new Date(isoDate);
          const options = { year: 'numeric', month: 'long', day: 'numeric' };
          return d.toLocaleDateString('en-US', options);
        };

        const startFormatted = formatDate(leaveData.startDate);

        // Save as last request for editing
        session.lastRequest = {
          type: 'leave',
          leaveType: leaveData.leaveType,
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          reason: leaveData.reason,
          recordId: sfResult.id
        };

        // Clear pending confirmation
        session.pendingConfirmation = null;

        return res.json({ 
          reply: `✅ Leave request created successfully!\n\n📋 Summary:\n• Request ID: ${sfResult.id}\n• Employee: ${leaveData.employeeName}\n• Type: ${leaveData.leaveType.toUpperCase()}\n• Date: ${startFormatted}\n• Reason: ${leaveData.reason}\n• Status: Pending Approval\n\nYour manager will review this request shortly. You'll receive an email notification once it's processed.\n\n✏️ Need to make changes? Just say "edit" to update any details.`
        });
      } else if (isNo) {
        // User cancelled
        session.pendingConfirmation = null;
        return res.json({ 
          reply: `❌ Request cancelled. No record was created.\n\nWould you like to:\n• Submit a different request?\n• Check your leave balance?\n• View leave policy?`
        });
      } else {
        // Unclear response
        return res.json({ 
          reply: `I didn't understand your response.\n\nPlease reply with:\n• "Yes" or "Confirm" to submit the request\n• "No" or "Cancel" to cancel the request`
        });
      }
    }

    // If there's a pending leave date and user just provided a reason
    if (pendingLeaveDate && message.trim().length > 0 && message.trim().length < 100 && !hasDateInfo) {
      // User is likely providing the reason for the pending leave
      const reason = message.replace(/^for\s+/i, '').trim();
      
      console.log('📧 Received email from frontend:', req.body.employeeEmail);
      
      const leaveData = {
        employeeName: 'You',
        leaveType: 'Annual',
        startDate: pendingLeaveDate,
        endDate: pendingLeaveDate,
        reason: reason,
        employeeEmail: req.body.employeeEmail || null  // Email from frontend
      };

      // Save to pending confirmation instead of creating immediately
      session.pendingConfirmation = leaveData;

      const formatDate = (isoDate) => {
        const d = new Date(isoDate);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return d.toLocaleDateString('en-US', options);
      };

      const startFormatted = formatDate(leaveData.startDate);

      return res.json({ 
        reply: `📋 **Please confirm your leave request:**\n\n• **Type**: ${leaveData.leaveType.toUpperCase()}\n• **Date**: ${startFormatted}\n• **Reason**: ${leaveData.reason}\n\nIs this correct?\n• Reply "Yes" or "Confirm" to submit\n• Reply "No" or "Cancel" to cancel`,
        needsConfirmation: true
      });
    }

    // Handle edit requests
    const isEditRequest = /\b(edit|change|modify|update|correct)\b/i.test(lowerMessage);
    if (isEditRequest && session.lastRequest) {
      // Check if user provided complete new details
      const newLeaveType = /sick/i.test(lowerMessage) ? 'Sick' : 
                          /casual/i.test(lowerMessage) ? 'Casual' : 
                          /annual/i.test(lowerMessage) ? 'Annual' : null;
      const newDate = dateParser.extractDate(message);
      const newReason = message.replace(/\b(edit|change|modify|update|correct|leave|sick|casual|annual)\b/gi, '').trim();

      if (newDate && newLeaveType) {
        // User provided complete new info
        session.lastRequest = null;
        session.pendingConfirmation = {
          employeeName: 'You',
          leaveType: newLeaveType,
          startDate: newDate,
          endDate: newDate,
          reason: newReason || 'Personal',
          employeeEmail: req.body.employeeEmail || null
        };

        const formatDate = (isoDate) => {
          const d = new Date(isoDate);
          const options = { year: 'numeric', month: 'long', day: 'numeric' };
          return d.toLocaleDateString('en-US', options);
        };

        return res.json({
          reply: `📋 **Please confirm your UPDATED leave request:**\n\n• **Type**: ${newLeaveType.toUpperCase()}\n• **Date**: ${formatDate(newDate)}\n• **Reason**: ${newReason || 'Personal'}\n\nIs this correct?\n• Reply "Yes" or "Confirm" to update\n• Reply "No" or "Cancel" to keep the original`
        });
      } else {
        // Ask for complete details
        const last = session.lastRequest;
        return res.json({
          reply: `✏️ Got it! Let's update your leave request.\n\n**Current Details:**\n• Type: ${last.leaveType}\n• Date: ${last.startDate}\n• Reason: ${last.reason}\n\n**You can update any of these details:**\n• Change the type (Annual, Sick, Casual)\n• Change the date\n• Change the reason\n\nPlease provide the complete NEW information. For example:\n"Casual leave on 20.12.2025 for family event"`
        });
      }
    }

    // Fuzzy helpers: Levenshtein distance and keyword matcher
    const levenshtein = (a = '', b = '') => {
      const al = a.length, bl = b.length;
      if (al === 0) return bl;
      if (bl === 0) return al;
      const dp = Array.from({ length: bl + 1 }, (_, i) => Array(al + 1).fill(0));
      for (let i = 0; i <= bl; i++) dp[i][0] = i;
      for (let j = 0; j <= al; j++) dp[0][j] = j;
      for (let i = 1; i <= bl; i++) {
        for (let j = 1; j <= al; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];
          else dp[i][j] = Math.min(dp[i - 1][j - 1] + 1, dp[i][j - 1] + 1, dp[i - 1][j] + 1);
        }
      }
      return dp[bl][al];
    };

    const containsAnyKeyword = (msg, keywords = []) => {
      if (!msg) return false;
      const cleaned = msg.replace(/[\.,!?]/g, ' ');
      const words = cleaned.split(/\s+/).filter(Boolean);
      const full = cleaned.toLowerCase();
      for (const kw of keywords) {
        const lowKw = String(kw).toLowerCase();
        if (full.includes(lowKw)) return true; // direct phrase match
        const parts = lowKw.split(/\s+/);
        // dynamic threshold: allow higher edit distance for longer keywords
        const threshold = lowKw.length >= 8 ? 2 : 1;
        if (parts.length > 1) {
          let all = true;
          for (const p of parts) {
            const found = words.some(w => levenshtein(w.toLowerCase(), p) <= threshold || w.toLowerCase() === p);
            if (!found) { all = false; break; }
          }
          if (all) return true;
        } else {
          for (const w of words) {
            if (levenshtein(w.toLowerCase(), lowKw) <= threshold) return true;
          }
        }
      }
      return false;
    };

    // helper: current month/year info
    const getCurrentMonthYear = () => {
      const d = new Date();
      const month = d.getMonth() + 1; // 1-12
      const monthPadded = String(month).padStart(2, '0');
      const year = d.getFullYear();
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      return { month, monthPadded, year, monthName };
    };

    // Quick-apply parsing: detect patterns like "annual,8.8.25,fever,karisni" or natural phrases
    const quickParts = message.split(',').map(s => s.trim()).filter(Boolean);
    const looksLikeQuickApply = quickParts.length >= 3 && /(annual|sick|casual)/i.test(quickParts[0]);
    
    // Enhanced natural apply detection: check if message contains leave intent AND a recognizable date
    const hasLeaveIntent = /\b(apply|i want|i need|want|leave|take)\b/i.test(lowerMessage);
    const naturalApply = hasLeaveIntent && hasDateInfo;

    if (looksLikeQuickApply || naturalApply) {
      try {
        console.log('🔍 Apply Flow:', { looksLikeQuickApply, naturalApply });
        // Parse quickParts if comma-separated
        let leaveType, startDateStr, endDateStr, reason, employeeName;
        if (looksLikeQuickApply) {
          console.log('  → Using QUICK APPLY path');
          leaveType = quickParts[0];
          startDateStr = quickParts[1];
          // If only one date provided assume single day
          if (/\d/.test(quickParts[2]) && quickParts[2].split(/\.|\-|\//).length > 1) {
            endDateStr = quickParts[2];
            reason = quickParts[3];
            employeeName = quickParts[4] || 'You';
          } else {
            // pattern: type,date,reason,name
            endDateStr = startDateStr;
            reason = quickParts[2];
            employeeName = quickParts[3] || 'You';
          }
        } else {
          // Natural language handling - be permissive and user-friendly
          console.log('  → Using NATURAL LANGUAGE path');
          leaveType = /sick/i.test(lowerMessage) ? 'sick' : /casual/i.test(lowerMessage) ? 'casual' : /annual/i.test(lowerMessage) ? 'annual' : 'annual';

          // Use enhanced date parser to extract dates
          startDateStr = dateParser.extractDate(message);
          console.log('  → dateParser.extractDate returned:', startDateStr);
          endDateStr = startDateStr;

          // Extract reason after the word 'for' (e.g., "for son's marriage", "for attending cousin marriage")
          const forMatch = message.match(/for\s+(.+?)(?:\.|,|$)/i);
          if (forMatch) {
            reason = forMatch[1].trim();
          }

          // If no explicit reason found, check if message contains reason keywords
          if (!reason) {
            // Extract any text that's not date-related and not leave keywords
            const wordsWithoutDate = lowerMessage
              .replace(/\b(\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty[- ]?first|twenty[- ]?second|twenty[- ]?third|twenty[- ]?fourth|twenty[- ]?fifth|twenty[- ]?sixth|twenty[- ]?seventh|twenty[- ]?eighth|twenty[- ]?ninth|thirtieth|thirty[- ]?first)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)(?:\s+(\d{4}))?\b/gi, '')
              .replace(/\b(tomorrow|today|\d{1,2}[\.\-/]\d{1,2}(?:[\.\-/]\d{2,4})?)\b/gi, '')
              .replace(/\b(i want|apply|leave|on|the|wfh|work from home|as)\b/gi, '')
              .trim();
            
            if (wordsWithoutDate.length > 3) {
              reason = wordsWithoutDate;
            } else {
              reason = null;
            }
          }

          // If user provided comma-separated fields like "..., reason, name"
          const byName = message.split(',').map(s => s.trim()).filter(Boolean);
          if (byName.length >= 2 && reason) {
            // If first token is not the date token, try to find a name in last position
            const possibleName = byName[byName.length - 1];
            // Heuristic: if possibleName looks like a single word (no spaces) or contains uppercase, treat as name
            if (/^[A-Za-z\s]+$/.test(possibleName) && !possibleName.match(/\d/)) {
              employeeName = possibleName;
            }
          }

          // sensible defaults: don't ask for name—assume requester ('You') if missing
          employeeName = employeeName || 'You';
          // DON'T set default reason here - we want to prompt if missing
        }

        // Use enhanced date parser that understands multiple formats
        const extractDateFromText = (text) => {
          const parsedDate = dateParser.extractDate(text);
          if (parsedDate) {
            return { iso: parsedDate };
          }
          return { iso: null };
        };

        // If startDateStr/endDateStr are already ISO format (YYYY-MM-DD), use them directly
        // Otherwise, parse from the message
        let sDate, eDate;
        if (startDateStr && /^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
          // Already in ISO format, use directly
          sDate = startDateStr;
        } else {
          // Parse from message
          const sParsed = extractDateFromText(startDateStr || message);
          sDate = sParsed.iso || null;
        }
        
        if (endDateStr && /^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
          // Already in ISO format, use directly
          eDate = endDateStr;
        } else {
          // Parse from message
          const eParsed = extractDateFromText(endDateStr || message);
          eDate = eParsed.iso || sDate;
        }

        console.log('🔍 Date Parsing Debug:');
        console.log('  - Input message:', message);
        console.log('  - Extracted sDate:', sDate);
        console.log('  - Display format:', sDate ? dateParser.formatForDisplay(sDate) : 'null');

        // If we couldn't parse a date, ask for clarification
        if (!sDate) {
          return res.json({ 
            reply: `I couldn't find a clear date in your message. You can write the date in many ways:\n` +
                   `• Numeric: 15.1.2025, 15-01-2025, 15/1/2025\n` +
                   `• With month names: 15 jan, jan 15th, 15 january 2025\n` +
                   `• Relative: today, tomorrow\n` +
                   `Please try again with any format you prefer!`
          });
        }

        // If no reason provided, ask for it
        if (!reason) {
          const displayDate = dateParser.formatForDisplay(sDate);
          return res.json({ 
            reply: `I understand you want leave on ${displayDate}. Could you please tell me the reason? For example: "for cousin's wedding" or "for medical appointment"`,
            pendingDate: sDate
          });
        }

        // Validate date is not in the past (allow today and future)
        const todayOnly = new Date();
        todayOnly.setHours(0, 0, 0, 0);
        
        // Parse date correctly without timezone issues
        const [year, month, day] = sDate.split('-').map(Number);
        const parsedStart = new Date(year, month - 1, day);
        parsedStart.setHours(0, 0, 0, 0);
        
        console.log('📅 Date Validation:');
        console.log('  - sDate string:', sDate);
        console.log('  - Parsed parts: year=' + year + ', month=' + month + ', day=' + day);
        console.log('  - JavaScript Date:', parsedStart.toISOString());
        console.log('  - Today:', todayOnly.toISOString());
        console.log('  - Is past?', parsedStart < todayOnly);
        
        if (parsedStart < todayOnly) {
          return res.json({ 
            reply: `The date you provided (${dateParser.formatForDisplay(sDate)}) is in the past. Please provide a date that is today or in the future.` 
          });
        }

        // If user mentioned WFH, create a WFH record instead of leave
        const isWFH = containsAnyKeyword(lowerMessage, ['wfh','work from home','workfromhome']);
        if (isWFH) {
          const wfhData = {
            employeeName: employeeName || 'You',
            date: sDate,
            reason: reason || 'No reason provided',
            employeeEmail: req.body.employeeEmail || null
          };

          // Create WFH record in Salesforce
          const sfResult = await salesforceService.createWFHRecord(wfhData);
          
          if (!sfResult.success) {
            console.warn('⚠️ Salesforce failed, using mock database');
            const wfhRec = {
              id: `WFH_${nextId++}`,
              ...wfhData,
              status: 'Approved',
              createdAt: new Date().toISOString()
            };
            mockDatabase.push(wfhRec);
            sfResult.id = wfhRec.id;
          }

          console.log('✅ WFH record created:', sfResult.id);
          return res.json({ reply: `✅ WFH request recorded: ${sfResult.id} — ${wfhData.employeeName}, ${wfhData.date}. Reason: ${wfhData.reason}. Status: Pending Approval` });
        }

        // Prepare leave record data
        console.log('📧 Received email from frontend (quick-leave):', req.body.employeeEmail);
        
        const leaveData = {
          employeeName: employeeName || 'You',
          leaveType: leaveType || 'Annual',
          startDate: sDate,
          endDate: eDate,
          reason: reason || 'No reason provided',
          employeeEmail: req.body.employeeEmail || null
        };

        // Save to pending confirmation instead of creating immediately
        session.pendingConfirmation = leaveData;

        // Format date for better readability
        const formatDate = (isoDate) => {
          const d = new Date(isoDate);
          const options = { year: 'numeric', month: 'long', day: 'numeric' };
          return d.toLocaleDateString('en-US', options);
        };

        const startFormatted = formatDate(leaveData.startDate);
        const endFormatted = leaveData.startDate === leaveData.endDate ? startFormatted : formatDate(leaveData.endDate);
        const dateRange = leaveData.startDate === leaveData.endDate ? startFormatted : `${startFormatted} to ${endFormatted}`;

        return res.json({ 
          reply: `📋 **Please confirm your leave request:**\n\n• **Type**: ${leaveData.leaveType.toUpperCase()}\n• **Date**: ${dateRange}\n• **Reason**: ${leaveData.reason}\n\nIs this correct?\n• Reply "Yes" or "Confirm" to submit\n• Reply "No" or "Cancel" to cancel`,
          needsConfirmation: true
        });
      } catch (err) {
        console.error('Quick-apply parsing error:', err);
        // fall through to regular responses
      }
    }

    if ((containsAnyKeyword(lowerMessage, ['leave policy','leave policies','leave balance','leave entitlement']) || (containsAnyKeyword(lowerMessage,['leave']) && containsAnyKeyword(lowerMessage,['policy','balance','entitlement'])))) {
      response = `📋 Winfomi Leave Policy Summary\n\nAnnual Leave: 21 days (1.75/month)\nSick Leave: 12 days — medical certificate required for 3+ consecutive days\nCasual Leave: 12 days — 1 day advance notice recommended\n\nApplication Process:\n• Minimum 2 days advance notice\n• Manager approval required\n• Apply through People Portal or by chatting with the HR Agent`;

    } else if (containsAnyKeyword(lowerMessage, ['holiday', 'holidays', 'holiday calendar', 'holidaylist', 'calendar', 'calender', 'calandar', 'give calendar', 'show calendar', 'calendar list', 'calendar please'])) {
      response = `🎉 Winfomi Technologies Holiday Calendar 2024\n\n• Jan 26 - Republic Day\n• Mar 08 - Holi\n• Aug 15 - Independence Day\n• Oct 02 - Gandhi Jayanti\n• Nov 01 - Diwali\n• Dec 25 - Christmas Day\n\nTotal: 6 main holidays | Working Days: Mon-Fri`;

    // Event keywords: ONLY if user mentions an event BUT does NOT provide a date (incomplete request)
    } else if (containsAnyKeyword(lowerMessage, ['wedding','marriage','ceremony','housewarming','house warming','party','function']) && !hasDateInfo) {
      // If they explicitly asked for WFH, route to WFH flow
      if (containsAnyKeyword(lowerMessage, ['wfh','work from home','workfromhome'])) {
        response = `🏠 I can help you apply for Work From Home for this event. Example: "WFH tomorrow for house warming ceremony" — or send the date and I'll record it.`;
      } else if (containsAnyKeyword(lowerMessage, ['leave','apply','time off','vacation'])) {
        response = `🏖️ I can help you apply leave for this event. Please tell me the date (e.g. "7.9" or "2025-09-28") or reply naturally like "Apply leave on 7.9 for house warming".`;
      } else {
        // ambiguous: ask for clarification whether they want WFH or leave
        // extract a short event phrase to include in the question
        const evMatch = lowerMessage.match(/(wedding|marriage|ceremony|house ?warming|party|function)/i);
        const evText = evMatch ? evMatch[0] : 'this event';
        response = `I see you mentioned ${evText}. Would you like to apply for leave or request WFH for this? Please reply with 'leave' or 'wfh' and include the date (e.g. "7.9").`;
      }

    } else if ((containsAnyKeyword(lowerMessage,['apply','apply leave','apply for leave','i want','i need','want']) && containsAnyKeyword(lowerMessage,['leave','vacation','time off']))) {
      response = `🏖️ I can help you apply for leave. You can type naturally, for example:\n- "Sick leave tomorrow for fever"\n- "Apply annual 18.10.2025 for wedding, Karisni"\nOr use the API: POST /api/leave/apply`;

    } else if ((containsAnyKeyword(lowerMessage,['apply','request','apply for','i want','i need']) && containsAnyKeyword(lowerMessage,['wfh','work from home','workfromhome'])) || containsAnyKeyword(lowerMessage,['wfh','work from home','workfromhome'])) {
      response = `🏠 I can help you apply for Work From Home. Example: "WFH tomorrow for doctor's appointment, Karisni" or use POST /api/wfh/apply`;

    } else if (containsAnyKeyword(lowerMessage, ['reimbursement','reimburse','reimburs','expense','expenses','reimbursment'])) {
      response = `💰 Reimbursement Process\n\nAvailable types:\n• Travel expenses (original receipts required)\n• Medical (₹25,000/year)\n• Internet (₹1,500/month)\n• Mobile (₹2,000/month)\n\nProcess: Submit through People Portal or attach receipts to your request within 30 days.`;

    // If the message is casual chit-chat or not related to HR actions, list available operations
    } else {
      const casualRegex = /\b(hi|hello|hii|hey|how are you|how r u|how r you|how are u|how are you doing|how's it going|what's up|whats up|can i ask|can i ask other than these|just saying hi)\b/i;
      const isCasual = casualRegex.test(message);

      // Known intents check: if message doesn't match known intents (leave, wfh, holiday, reimbursement)
      const knownIntent = containsAnyKeyword(lowerMessage, ['leave','apply','wfh','work from home','holiday','calendar','reimbursement','reimburse','policy','balance','vacation','time off']);

      if (isCasual || (!knownIntent && message.trim().length < 120)) {
        // Short, natural reply for casual or off-topic messages
        response = `Hi there — I can help with leave, WFH, reimbursements, and holiday info. What would you like to do today?`;
      } else {
        // Short guidance for other unknown messages
        response = `I can help with leave applications, WFH requests, reimbursements, and the holiday calendar. Tell me what you'd like to do.`;
      }
    }

    res.json({ reply: response, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat service error' });
  }
});

app.post('/api/leave/apply', async (req, res) => {
  try {
    const { employeeName, leaveType, startDate, endDate, reason } = req.body;

    if (!employeeName || !leaveType || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: employeeName, leaveType, startDate, endDate' 
      });
    }

    const leaveData = {
      employeeName,
      leaveType,
      startDate,
      endDate,
      reason: reason || 'No reason provided'
    };

    // Create record in Salesforce
    const sfResult = await salesforceService.createLeaveRecord(leaveData);
    
    if (!sfResult.success) {
      console.warn('⚠️ Salesforce failed, using mock database');
      const record = {
        id: `LR-${String(nextId).padStart(4, '0')}`,
        ...leaveData,
        status: 'Pending Approval',
        createdAt: new Date().toISOString()
      };
      nextId++;
      mockDatabase.push(record);
      sfResult.id = record.id;
    }

    console.log('✅ Leave record created:', sfResult.id);

    res.json({
      success: true,
      message: '✅ Leave application submitted successfully!',
      details: {
        recordId: sfResult.id,
        salesforceId: sfResult.salesforceId,
        employeeName,
        leaveType,
        startDate,
        endDate,
        status: 'Pending Approval',
        nextSteps: 'Your manager will review and approve your leave request within 2 business days.'
      }
    });

  } catch (error) {
    console.error('Leave application error:', error);
    res.status(500).json({ error: 'Failed to process leave application' });
  }
});

app.post('/api/wfh/apply', async (req, res) => {
  try {
    const { employeeName, date, reason } = req.body;

    if (!employeeName || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields: employeeName, date' 
      });
    }

    const wfhData = {
      employeeName,
      date,
      reason: reason || 'No reason provided'
    };

    // Create WFH record in Salesforce
    const sfResult = await salesforceService.createWFHRecord(wfhData);
    
    if (!sfResult.success) {
      console.warn('⚠️ Salesforce failed, using mock database');
      const record = {
        id: `WFH_${nextId++}`,
        ...wfhData,
        status: 'Pending Approval',
        createdAt: new Date().toISOString()
      };
      mockDatabase.push(record);
      sfResult.id = record.id;
    }

    console.log('✅ WFH record created:', sfResult.id);

    res.json({
      success: true,
      message: '✅ Work From Home request submitted!',
      details: {
        recordId: sfResult.id,
        salesforceId: sfResult.salesforceId,
        employeeName,
        date,
        status: 'Pending Approval',
        nextSteps: 'Your manager will review your WFH request. Ensure you have proper internet connectivity.'
      }
    });

  } catch (error) {
    console.error('WFH application error:', error);
    res.status(500).json({ error: 'Failed to process WFH application' });
  }
});

app.get('/api/leave/status/:id', async (req, res) => {
  const requestId = req.params.id;
  
  // Try to find in mock database first
  let record = mockDatabase.find(r => r.id === requestId);
  
  // If not in mock and looks like Salesforce ID, query Salesforce
  if (!record && requestId.startsWith('a2A')) {
    try {
      const sfResult = await salesforceService.getRecord(requestId);
      if (sfResult.success) {
        record = sfResult.record;
      }
    } catch (error) {
      console.error('Error querying Salesforce:', error);
    }
  }
  
  if (record) {
    res.json({ success: true, record });
  } else {
    res.status(404).json({ error: 'Record not found' });
  }
});

// Manager Approval Endpoint
app.post('/api/manager/approve/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { managerComments, managerName } = req.body;
    
    // Update in Salesforce (only update Status__c since other fields may not exist)
    const sfResult = await salesforceService.updateRecord(requestId, {
      Status__c: 'Approved'
    });
    
    // Check if error is due to flow trigger issue (still counts as success since record was updated)
    const isFlowError = sfResult.error && sfResult.error.includes('CANNOT_EXECUTE_FLOW_TRIGGER');
    
    if (!sfResult.success && !isFlowError) {
      // Fallback to mock database only for real failures
      const record = mockDatabase.find(r => r.id === requestId);
      if (record) {
        record.status = 'Approved';
        record.managerComments = managerComments;
        record.approvalDate = new Date().toISOString();
      }
    }
    
    if (isFlowError) {
      console.warn('⚠️ Record approved but flow notification failed (email issue)');
    }
    
    console.log('✅ Leave request approved:', requestId);
    
    res.json({ 
      success: true, 
      message: 'Leave request approved successfully' + (isFlowError ? ' (notification may have failed)' : ''),
      salesforceUpdated: sfResult.success || isFlowError,
      warning: isFlowError ? 'Flow email notification failed - please notify employee manually' : null
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Manager Rejection Endpoint
app.post('/api/manager/reject/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { managerComments, managerName } = req.body;
    
    // Update in Salesforce (only update Status__c since other fields may not exist)
    const sfResult = await salesforceService.updateRecord(requestId, {
      Status__c: 'Rejected'
    });
    
    // Check if error is due to flow trigger issue (still counts as success since record was updated)
    const isFlowError = sfResult.error && sfResult.error.includes('CANNOT_EXECUTE_FLOW_TRIGGER');
    
    if (!sfResult.success && !isFlowError) {
      // Fallback to mock database only for real failures
      const record = mockDatabase.find(r => r.id === requestId);
      if (record) {
        record.status = 'Rejected';
        record.managerComments = managerComments;
        record.approvalDate = new Date().toISOString();
      }
    }
    
    if (isFlowError) {
      console.warn('⚠️ Record rejected but flow notification failed (email issue)');
    }
    
    console.log('✅ Leave request rejected:', requestId);
    
    res.json({ 
      success: true, 
      message: 'Leave request rejected' + (isFlowError ? ' (notification may have failed)' : ''),
      salesforceUpdated: sfResult.success || isFlowError,
      warning: isFlowError ? 'Flow email notification failed - please notify employee manually' : null
    });
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Manager Dashboard - List all pending requests
app.get('/api/manager/pending', async (req, res) => {
  try {
    // Query pending requests from Salesforce
    const sfResult = await salesforceService.queryRecords('Pending');
    
    if (sfResult.success) {
      res.json({ success: true, requests: sfResult.records });
    } else {
      // Fallback to mock database
      const pendingRequests = mockDatabase.filter(r => 
        r.status === 'Pending Approval' || r.status === 'Pending'
      );
      res.json({ success: true, requests: pendingRequests });
    }
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.json({ success: true, requests: mockDatabase.filter(r => r.status === 'Pending Approval') });
  }
});

app.get('/api/wfh/status/:id', (req, res) => {
  const record = mockDatabase.find(r => r.id === req.params.id);
  if (record) {
    res.json({ success: true, record });
  } else {
    res.status(404).json({ error: 'Record not found' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'HR Agent Bot is running',
    timestamp: new Date().toISOString(),
    demoMode: true,
    recordsCreated: mockDatabase.length
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/manager/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manager-dashboard.html'));
});

// Approval endpoint - handles approve/reject actions
app.get('/approve', async (req, res) => {
  const { id, action, token } = req.query;
  
  if (!id || !action) {
    return res.status(400).send('<h1>Invalid Request</h1><p>Missing record ID or action.</p>');
  }
  
  // Simple token validation (token is the record ID itself for simplicity)
  if (token !== id) {
    return res.status(403).send('<h1>Unauthorized</h1><p>Invalid approval token.</p>');
  }
  
  try {
    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
    
    // Update record in Salesforce
    const result = await salesforceService.updateRecord('Leave_Request__c', id, {
      Status__c: newStatus
    });
    
    if (result.success) {
      // Send success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Approval ${action === 'approve' ? 'Approved' : 'Rejected'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: ${action === 'approve' ? '#28a745' : '#dc3545'};
              margin-bottom: 10px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .record-id {
              background: #f8f9fa;
              padding: 10px;
              border-radius: 5px;
              margin: 20px 0;
              font-family: monospace;
            }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              margin-top: 20px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              transition: background 0.3s;
            }
            .btn:hover {
              background: #5568d3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${action === 'approve' ? '✅' : '❌'}</div>
            <h1>Leave Request ${newStatus}!</h1>
            <p>The leave request has been successfully ${action === 'approve' ? 'approved' : 'rejected'}.</p>
            <div class="record-id">Record ID: ${id}</div>
            <p>The employee will be notified via email about this decision.</p>
            <a href="https://winfomi--dev7.sandbox.my.salesforce.com/${id}" class="btn">View in Salesforce</a>
          </div>
        </body>
        </html>
      `);
    } else {
      throw new Error(result.error || 'Failed to update record');
    }
  } catch (error) {
    console.error('❌ Approval error:', error);
    res.status(500).send(`
      <h1>Error</h1>
      <p>Failed to ${action} the leave request.</p>
      <p>Error: ${error.message}</p>
    `);
  }
});

// API endpoint for programmatic approval
app.post('/api/approve-leave', async (req, res) => {
  const { recordId, action, token } = req.body;
  
  if (!recordId || !action) {
    return res.status(400).json({ error: 'Missing recordId or action' });
  }
  
  // Validate token (token is record ID for simplicity)
  if (token !== recordId) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  
  try {
    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
    const result = await salesforceService.updateRecord('Leave_Request__c', recordId, {
      Status__c: newStatus
    });
    
    res.json({ success: result.success, status: newStatus, recordId });
  } catch (error) {
    console.error('❌ API approval error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 HR Agent Bot running on http://localhost:${PORT}`);
  console.log(`📋 Demo Mode: ENABLED`);
  console.log(`🏢 Company: Winfomi Technologies`);
  console.log(`🌐 Open browser to: http://localhost:${PORT}`);
});