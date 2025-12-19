import { AiService } from '../services/aiService'
import {SalesforceService } from '../services/salesforceService'
import dateParser from '../services/dateParser'
import entityExtractor from '../utils/entityExtractor'
import contextManager  from '../utils/contextManager'

import { Request, Response } from 'express';


import * as path from 'path';
import * as fs from 'fs';

const aiService = new AiService();
const salesforceService = new SalesforceService();

function getSessionId(req: Request): string {
  return req.headers['x-session-id'] as string || 'default-session';
}

const ALLOW_PAST_DATES = process.env.ALLOW_BACKDATED_LEAVE === 'true';
const DEFAULT_EMPLOYEE_NAME = 'Current User';
const MAX_EMAIL_ATTEMPTS = 3;

function isWinfomiEmail(value: string): boolean {
  const candidate = value.trim().toLowerCase();
  return /^[^\s@]+@winfomi\.com$/i.test(candidate);
}

function extractPotentialEmail(message: string, payloadEmail?: string): string | null {
  const trimmedMessage = message.trim();

  if (/^[^\s@]+@[^\s@]+$/.test(trimmedMessage)) {
    return trimmedMessage;
  }

  const extracted = entityExtractor.extractEmail(message);
  if (extracted) {
    return extracted.trim();
  }

  if (payloadEmail && payloadEmail.trim()) {
    return payloadEmail.trim();
  }

  return null;
}

function getFirstName(fullName: string | undefined): string {
  if (!fullName) {
    return 'there';
  }

  const [first] = fullName.trim().split(/\s+/);
  return first || 'there';
}

async function handleEmailVerificationFlow(
  sessionId: string,
  message: string,
  payloadEmail: string | undefined,
  res: Response
): Promise<boolean> {
  if (contextManager.isEmailVerificationLocked(sessionId)) {
    res.json({
      reply: 'I’m unable to continue because we couldn’t verify your Winfomi email earlier. Please contact HR for assistance.',
      intent: 'email_verification_locked',
      timestamp: new Date().toISOString()
    });
    return true;
  }

  let candidateEmail = extractPotentialEmail(message, payloadEmail);
  const awaitingEmail = contextManager.isAwaitingEmail(sessionId);

  // If user says 'change email', clear stored email and prompt again
  if (/\b(change|update|edit) email\b/i.test(message)) {
    contextManager.clearEmployeeProfile(sessionId);
    res.json({
      reply: 'Okay, please provide your new Winfomi email (example@winfomi.com).',
      intent: 'request_email',
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // If email is already stored, use it unless awaiting new email
  if (!candidateEmail && contextManager.hasUserEmail(sessionId) && !awaitingEmail) {
    candidateEmail = contextManager.getUserEmail(sessionId) ?? null;
  }

  if (candidateEmail) {
    console.log('📧 Candidate email extracted:', candidateEmail);
  } else {
    console.log('📧 No email found in message. awaitingEmail:', awaitingEmail);
  }

  if (!awaitingEmail && !candidateEmail) {
    contextManager.setAwaitingEmail(sessionId);
    res.json({
      reply: "Please enter your Winfomi email (example@winfomi.com). I'll use it to find your employee record.",
      intent: 'request_email',
      timestamp: new Date().toISOString()
    });
    return true;
  }

  if (!candidateEmail) {
    const attempt = contextManager.incrementEmailAttempts(sessionId);
    const remaining = MAX_EMAIL_ATTEMPTS - attempt;

    if (attempt >= MAX_EMAIL_ATTEMPTS) {
      contextManager.setEmailVerificationLocked(sessionId, true);
      res.json({
        reply: 'I still can’t find a valid Winfomi email. Please contact HR so they can help you get set up.',
        intent: 'email_verification_failed',
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        reply: `That doesn’t look like a Winfomi email. Please enter an address that ends with winfomi.com. Attempts remaining: ${remaining}.`,
        intent: 'request_email',
        timestamp: new Date().toISOString()
      });
    }

    contextManager.updateContext(sessionId, { awaitingEmail: true });
    return true;
  }

  if (!isWinfomiEmail(candidateEmail)) {
    console.log('⚠️ Email failed Winfomi validation:', candidateEmail);
    const attempt = contextManager.incrementEmailAttempts(sessionId);
    const remaining = MAX_EMAIL_ATTEMPTS - attempt;

    if (attempt >= MAX_EMAIL_ATTEMPTS) {
      contextManager.setEmailVerificationLocked(sessionId, true);
      res.json({
        reply: 'I still can’t find a valid Winfomi email. Please contact HR so they can help you get set up.',
        intent: 'email_verification_failed',
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        reply: `Please provide your Winfomi email in the format example@winfomi.com. Attempts remaining: ${remaining}.`,
        intent: 'request_email',
        timestamp: new Date().toISOString()
      });
    }

    contextManager.updateContext(sessionId, { awaitingEmail: true });
    return true;
  }

  try {
    const lookup = await salesforceService.lookupUserByEmail(candidateEmail.toLowerCase());
    console.log('🔍 Email lookup result:', lookup);

    if (!lookup.success || !lookup.user) {
      console.log('❌ Email lookup failed for candidate:', candidateEmail);
      const attempt = contextManager.incrementEmailAttempts(sessionId);
      const remaining = MAX_EMAIL_ATTEMPTS - attempt;

      if (attempt >= MAX_EMAIL_ATTEMPTS) {
        contextManager.setEmailVerificationLocked(sessionId, true);
        res.json({
          reply: 'This email is not registered as a Winfomi employee. Please contact HR for assistance.',
          intent: 'email_verification_failed',
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({
          reply: `This email is not registered as a Winfomi employee. Please contact HR or provide a different Winfomi email. Attempts remaining: ${remaining}.`,
          intent: 'request_email',
          timestamp: new Date().toISOString()
        });
        contextManager.updateContext(sessionId, { awaitingEmail: true });
      }
      return true;
    }

    contextManager.setEmployeeProfile(sessionId, {
      id: lookup.user.id,
      name: lookup.user.name,
      email: lookup.user.email
    });

    const greetingName = getFirstName(lookup.user.name);

    res.json({
      reply: `Hi ${greetingName}, your account is verified. How can I help you today?`,
      intent: 'email_verified',
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.json({
      reply: 'I ran into an issue verifying your account right now. Please try again in a moment or contact HR.',
      intent: 'email_verification_error',
      timestamp: new Date().toISOString()
    });
    contextManager.updateContext(sessionId, { awaitingEmail: true });
    return true;
  }
}

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
async function processWfhRequest(
  sessionId: string,
  details: { date: string | null, reason: string | null, employeeName: string | null }
): Promise<any> {
  if (!details.date || !details.reason) {
    throw new Error('Missing required fields');
  }

  const employeeName = contextManager.getEmployeeName(sessionId) || details.employeeName || DEFAULT_EMPLOYEE_NAME;
  const employeeEmail = contextManager.getUserEmail(sessionId) || null;
  const employeeId = contextManager.getEmployeeId(sessionId) || null;

  // Check for overlapping leave or WFH on the same date
  // Check leave overlap
  const overlapCheck = await salesforceService.checkLeaveOverlap(
    employeeName,
    details.date,
    details.date
  );
  if (overlapCheck.hasOverlap && overlapCheck.overlappingLeaves.length > 0) {
    const leave = overlapCheck.overlappingLeaves[0];
    return {
      success: false,
      hasOverlap: true,
      message: `⚠️ You already have pending ${leave.leaveType} leave from ${leave.startDate} to ${leave.endDate}.\n\nPlease adjust your new request or update the existing leave first.`,
      overlappingLeaves: overlapCheck.overlappingLeaves
    };
  }

  // Optionally: check for overlapping WFH (if needed, add similar logic for mockWfhRecords)

  return await salesforceService.createWfhRecord({
    employeeName,
    employeeEmail,
    employeeId,
    date: details.date,
    reason: details.reason
  });
}

// Helper function to extract leave details using DateParser service
interface LeaveDetails {
  startDate: string | null;
  endDate: string | null;
  leaveType: string | null;
  reason: string | null;
  employeeName: string | null;
  durationDays?: number | null;
  isHalfDay?: boolean;
  errors?: string[];
}

function extractLeaveDetails(message: string): LeaveDetails {
  // Debug logging for troubleshooting half-day parsing
  console.log('[DEBUG] extractLeaveDetails input:', message);
  const parsedDates = dateParser.parseDates(message);
  const durationInfo = dateParser.parseDuration(message);
  console.log('[DEBUG] durationInfo:', durationInfo);
  const leaveType = extractLeaveType(message);
  let reason = extractReason(message);

  // Remove 'half day' and similar phrases from reason if present
  if (reason) {
    reason = reason.replace(/\b(a |an )?half([- ]?a)?[- ]?day(s)?\b/gi, '').replace(/\s+/g, ' ').trim();
    if (reason.length === 0) reason = null;
  }

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

  // If explicit half-day detected, force durationDays to 0.5
  let finalIsHalfDay = durationInfo.isHalfDay;
  let finalDurationDays = durationInfo.durationDays;
  if (finalIsHalfDay) {
    finalDurationDays = 0.5;
  } else {
    // fallback to calculated working days if not explicitly half-day
    finalDurationDays = calculateWorkingDays(startDate ?? null, endDate ?? null, false) ?? durationInfo.durationDays ?? null;
    // If calculated duration is 0.5, treat as half-day
    if (finalDurationDays === 0.5) finalIsHalfDay = true;
  }

  // If message contains 'half day' or similar, ensure isHalfDay true and durationDays 0.5
  if (/\b(a |an )?half([- ]?a)?[- ]?day(s)?\b/i.test(message)) {
    finalIsHalfDay = true;
    finalDurationDays = 0.5;
  }

  const debugResult = {
    startDate: startDate ?? null,
    endDate: endDate ?? startDate ?? null,
    leaveType,
    reason,
    employeeName: DEFAULT_EMPLOYEE_NAME,
    durationDays: finalDurationDays,
    isHalfDay: finalIsHalfDay,
    errors: errors.length ? Array.from(new Set(errors)) : undefined
  };
  console.log('[DEBUG] extractLeaveDetails result:', debugResult);
  return debugResult;
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
async function processLeaveRequest(
  sessionId: string,
  details: {
    startDate: string | null,
    endDate: string | null,
    leaveType: string | null,
    reason: string | null,
    employeeName: string | null,
    durationDays?: number | null,
    isHalfDay?: boolean,
    errors?: string[]
  }
): Promise<any> {
  // Block leave creation if any date is a holiday
  const holidaysPath = path.join(__dirname, '../../data/holidays.json');
  let holidaysList: any[] = [];
  try {
    const holidaysData = fs.readFileSync(holidaysPath, 'utf-8');
    const holidaysJson = JSON.parse(holidaysData);
    holidaysList = holidaysJson.holidays || [];
  } catch (e) {
    console.error('Failed to load holidays.json:', e);
  }
  const leaveDates = [];
  const start = new Date(details.startDate!);
  const end = new Date(details.endDate || details.startDate!);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    leaveDates.push(d.toISOString().slice(0, 10));
  }
  const holidayDates = holidaysList.map(h => h.date);
  const conflictHoliday = leaveDates.find(date => holidayDates.includes(date));
  if (conflictHoliday) {
    const holidayObj = holidaysList.find(h => h.date === conflictHoliday);
    return {
      success: false,
      isHoliday: true,
      holidayDate: conflictHoliday,
      holidayName: holidayObj?.name || 'Holiday',
      message: `Cannot apply leave on ${conflictHoliday} (${holidayObj?.name || 'Holiday'}). It is a company holiday.`
    };
  }

  const employeeName = contextManager.getEmployeeName(sessionId) || details.employeeName || DEFAULT_EMPLOYEE_NAME;
  const employeeEmail = contextManager.getUserEmail(sessionId) || null;
  const employeeId = contextManager.getEmployeeId(sessionId) || null;
  const endDate = details.endDate || details.startDate;

  // Check if the leave date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
  const requestDate = new Date(details.startDate!);
  requestDate.setHours(0, 0, 0, 0);

  if (requestDate < today) {
    // Past date - return error for backdated application
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
    details.startDate!,
    endDate!
  );

  if (overlapCheck.hasOverlap) {
    // Return overlap information instead of creating
    return {
      success: false,
      hasOverlap: true,
      overlappingLeaves: overlapCheck.overlappingLeaves
    };
  }

  const payload = {
    employeeName,
    employeeEmail,
    employeeId,
    startDate: details.startDate,
    endDate,
    reason: details.reason || 'Personal',
    leaveType: details.leaveType,
    durationDays: calculateWorkingDays(details.startDate, endDate, Boolean(details.isHalfDay)),
    isHalfDay: Boolean(details.isHalfDay)
  };

  return await salesforceService.createLeaveRecord(payload);
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
    // Block confirmation if the requested date is a holiday
    const holidaysPath = path.join(__dirname, '../../data/holidays.json');
    let holidaysList: any[] = [];
    try {
      const holidaysData = fs.readFileSync(holidaysPath, 'utf-8');
      const holidaysJson = JSON.parse(holidaysData);
      holidaysList = holidaysJson.holidays || [];
    } catch (e) {
      console.error('Failed to load holidays.json:', e);
    }
    const leaveDates = [];
    const start = new Date(newDetails.startDate);
    const end = new Date(newDetails.endDate || newDetails.startDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      leaveDates.push(d.toISOString().slice(0, 10));
    }
    const holidayDates = holidaysList.map(h => h.date);
    const conflictHoliday = leaveDates.find(date => holidayDates.includes(date));
    if (conflictHoliday) {
      const holidayObj = holidaysList.find(h => h.date === conflictHoliday);
      res.json({
        reply: `❌ Cannot apply leave on ${conflictHoliday} (${holidayObj?.name || 'Holiday'}). It is a company holiday.`,
        intent: 'leave_on_holiday',
        timestamp: new Date().toISOString()
      });
      return true;
    }
    if (await enforceLeaveBalance(sessionId, newDetails, res)) {
      return true;
    }
    const { errors, ...pendingDetails } = newDetails;
    pendingDetails.employeeName = contextManager.getEmployeeName(sessionId) || pendingDetails.employeeName || DEFAULT_EMPLOYEE_NAME;
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
    newDetails.employeeName = contextManager.getEmployeeName(sessionId) || newDetails.employeeName || DEFAULT_EMPLOYEE_NAME;
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

    const normalizedConfirmationAction = typeof confirmationAction === 'string' ? confirmationAction.toLowerCase() : null;
    const normalizedIntentOverride = typeof intentOverride === 'string' ? intentOverride.toLowerCase() : null;
    const shouldSkipHistory = normalizedConfirmationAction === 'yes' || normalizedConfirmationAction === 'no';

    const lowerMessage = message.toLowerCase();
    let response = '';

    // Add to conversation history
    if (!shouldSkipHistory) {
      contextManager.addToHistory(sessionId, message, 'unknown');
    }
    const payloadEmail = typeof employeeEmail === 'string' ? employeeEmail.trim() : undefined;
    const contextEmail = context && typeof context.userEmail === 'string' ? context.userEmail.trim() : undefined;
    const storedEmail = contextManager.getUserEmail(sessionId) || undefined;

    if (!contextManager.getEmployeeId(sessionId)) {
      const handled = await handleEmailVerificationFlow(
        sessionId,
        message,
        payloadEmail || contextEmail || storedEmail,
        res
      );

      if (handled) {
        return;
      }
    }

    // Check if user is responding to confirmation

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
            const leaveResult = await processLeaveRequest(sessionId, pending.details);
            
            if (leaveResult.isHoliday) {
              response = `❌ **Cannot create leave request for a company holiday**\n\n${leaveResult.holidayDate} (${leaveResult.holidayName}) is a company holiday. Leave applications are not allowed on holidays.`;
              return res.json({
                reply: response,
                intent: 'leave_on_holiday',
                timestamp: new Date().toISOString()
              });
            } else if (leaveResult.isPastDate) {
              response = `❌ **Cannot create leave request for past date**\n\nYou're trying to apply for leave on **${leaveResult.requestedDate}**, which is in the past (today is ${new Date().toISOString().split('T')[0]}).\n\n📋 **Policy for Backdated Leave:**\nAccording to company policy, leave applications must be submitted in advance. For emergency situations where you were unable to apply beforehand:\n\n• **Sick Leave**: Must be applied within 24 hours with a valid reason\n• **Other Leave Types**: Require manager pre-approval before the absence\n\n**What you can do:**\n• If this was an emergency sick leave, contact your manager directly to explain the situation\n• Your manager can manually approve retrospective leave through the HR system\n• For future leave, please apply at least 2 days in advance\n\nNeed help with something else?`;
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
            const wfhResult = await processWfhRequest(sessionId, {
              date: pending.details.date,
              reason: pending.details.reason,
              employeeName: pending.details.employeeName || DEFAULT_EMPLOYEE_NAME
            });
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

type IntentResult = { intent: string; entities?: Record<string, any> } | string;
const intentResult = aiService.detectIntent(message) as IntentResult;
const intent = typeof intentResult === 'object' ? intentResult.intent : intentResult;
const entities = typeof intentResult === 'object' && intentResult.entities ? intentResult.entities : {};
// Update history with detected intent
contextManager.addToHistory(sessionId, message, intent);

switch (intent) {
    case 'display_requests':
    case 'list_requests':
    case 'view_requests':
    case 'my_requests': {
      try {
        const employeeName = contextManager.getEmployeeName(sessionId) || DEFAULT_EMPLOYEE_NAME;
        const employeeEmail = contextManager.getUserEmail ? contextManager.getUserEmail(sessionId) : null;
        if (!employeeEmail) {
          res.json({
            reply: 'I need your email to fetch your requests. Please verify your account first.',
            intent: 'no_email_found',
            timestamp: new Date().toISOString()
          });
          return;
        }

        let leaveRequests = [];
        let wfhRequests = [];
        if (salesforceService.isDemoMode()) {
          // Demo mode: filter mock records for requests made through chatbot
          leaveRequests = salesforceService.getAllRecords().filter(r => r.Leave_Type__c && (r.Employee_Email__c === employeeEmail || r.Employee_Name__c === employeeName) && r.Request_Source__c === 'Chatbot');
          wfhRequests = salesforceService.getAllRecords().filter(r => r.Date__c && (r.email__c === employeeEmail || r.Employee_Name__c === employeeName) && r.Request_Source__c === 'Chatbot');
        } else {
          // Live mode: fetch only requests made through chatbot
          leaveRequests = (await salesforceService.getLeaveRequestsByEmail(employeeEmail)).filter(r => r.Request_Source__c === 'Chatbot');
          wfhRequests = (await salesforceService.getWfhRequestsByEmail(employeeEmail)).filter(r => r.Request_Source__c === 'Chatbot');
        }

        let response = `📋 **Your Requests**\n\n`;
        if (leaveRequests.length === 0 && wfhRequests.length === 0) {
          response = `You haven't made any leave or WFH requests through the chatbot yet.\n\n` +
                     `Would you like to:\n` +
                     `• Apply for leave\n` +
                     `• Apply for WFH\n` +
                     `• Check your leave balance`;
          res.json({ reply: response, intent: 'no_requests_found', timestamp: new Date().toISOString() });
          return;
        }

        if (leaveRequests.length > 0) {
          response += `**Leave Requests (${leaveRequests.length})**\n`;
          for (const leave of leaveRequests) {
            const statusEmoji = 
              leave.Status__c === 'Approved' ? '✅' :
              leave.Status__c === 'Rejected' ? '❌' :
              leave.Status__c === 'Pending' ? '⏳' :
              leave.Status__c === 'Cancelled' ? '🚫' : '❓';
            response += `${statusEmoji} **${leave.Leave_Type__c}** - ${leave.Start_Date__c} to ${leave.End_Date__c}\n`;
            response += `   Status: ${leave.Status__c} | Reason: ${leave.Reason__c || 'Not specified'}\n`;
            response += `   ID: ${leave.Id}\n\n`;
          }
        }

        if (wfhRequests.length > 0) {
          response += `\n**WFH Requests (${wfhRequests.length})**\n`;
          for (const wfh of wfhRequests) {
            const statusEmoji = 
              wfh.Status__c === 'Approved' ? '✅' :
              wfh.Status__c === 'Rejected' ? '❌' :
              wfh.Status__c === 'Pending' ? '⏳' :
              wfh.Status__c === 'Cancelled' ? '🚫' : '❓';
            response += `${statusEmoji} **${wfh.Date__c}**\n`;
            response += `   Status: ${wfh.Status__c}\n`;
            response += `   Reason: ${wfh.Reason__c || 'Personal'}\n`;
            response += `   ID: ${wfh.Id}\n\n`;
          }
        }

        response += `\n**Legend:**\n✅ Approved | ❌ Rejected | ⏳ Pending | 🚫 Cancelled\n`;
        response += `\nWould you like to view details, edit, or cancel any request?`;

        res.json({
          reply: response,
          intent: 'requests_listed',
          requestCount: leaveRequests.length + wfhRequests.length,
          timestamp: new Date().toISOString()
        });
        return;
      } catch (error) {
        console.error('Error fetching requests:', error);
        res.json({
          reply: 'Unable to fetch your requests. Please try again or contact HR.',
          intent: 'error',
          timestamp: new Date().toISOString()
        });
      }
      break;
    }

      case 'list_requests': {
        // Use entities from intentResult
        const type = entities?.type || 'both';
        const month = entities?.month;
        const year = entities?.year;
        const week = entities?.week;
        const employeeName = contextManager.getEmployeeName(sessionId) || DEFAULT_EMPLOYEE_NAME;
        // Get all records (mock/demo mode)
        let allRecords = salesforceService.getAllRecords();
        // Filter by employee
        allRecords = allRecords.filter(r => (r.Employee_Name__c || r.Employee_Name) === employeeName);
        // Filter by type
        let filtered = allRecords;
        if (type === 'leave') filtered = filtered.filter(r => r.Leave_Type__c);
        else if (type === 'wfh') filtered = filtered.filter(r => r.Date__c);
        // Filter by time
        if (month || year || week) {
          filtered = filtered.filter(r => {
            let dateStr = r.Start_Date__c || r.Date__c;
            if (!dateStr) return false;
            const date = new Date(dateStr);
            if (year && date.getFullYear() !== Number(year)) return false;
            if (month) {
              const monthNum = new Date(`${month} 1, 2000`).getMonth();
              if (date.getMonth() !== monthNum) return false;
            }
            if (week) {
              const weekNum = Math.ceil((date.getDate() - 1 + (new Date(date.getFullYear(), date.getMonth(), 1).getDay() || 7)) / 7);
              if (Number(week) !== weekNum) return false;
            }
            return true;
          });
        }
        if (filtered.length === 0) {
          response = `No ${type === 'both' ? 'leave or WFH' : type} requests found${month || year || week ? ' for the specified period' : ''}.`;
        } else {
          response = `📋 **Your ${type === 'both' ? 'Leave & WFH' : type.toUpperCase()} Requests${month || year || week ? ' (filtered)' : ''}:**\n\n`;
          for (const r of filtered) {
            if (r.Leave_Type__c) {
              response += `• [LEAVE] ${r.Leave_Type__c} | ${r.Start_Date__c} to ${r.End_Date__c} | Status: ${r.Status__c}\n`;
            } else if (r.Date__c) {
              response += `• [WFH] ${r.Date__c} | Status: ${r.Status__c}\n`;
            }
          }
        }
        res.json({
          reply: response,
          intent: 'list_requests',
          timestamp: new Date().toISOString()
        });
        return;
      }
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

        // Block confirmation if the requested date is a holiday
        const holidaysPath = path.join(__dirname, '../../data/holidays.json');
        let holidaysList: any[] = [];
        try {
          const holidaysData = fs.readFileSync(holidaysPath, 'utf-8');
          const holidaysJson = JSON.parse(holidaysData);
          holidaysList = holidaysJson.holidays || [];
        } catch (e) {
          console.error('Failed to load holidays.json:', e);
        }
        const leaveDates = [];
        const start = new Date(leaveDetails.startDate);
        const end = new Date(leaveDetails.endDate || leaveDetails.startDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          leaveDates.push(d.toISOString().slice(0, 10));
        }
        const holidayDates = holidaysList.map(h => h.date);
        const conflictHoliday = leaveDates.find(date => holidayDates.includes(date));
        if (conflictHoliday) {
          const holidayObj = holidaysList.find(h => h.date === conflictHoliday);
          response = `❌ Cannot apply leave on ${conflictHoliday} (${holidayObj?.name || 'Holiday'}). It is a company holiday.`;
          res.json({
            reply: response,
            intent: 'leave_on_holiday',
            timestamp: new Date().toISOString()
          });
          return;
        }

        const sessionEmployeeName = contextManager.getEmployeeName(sessionId) || leaveDetails.employeeName || DEFAULT_EMPLOYEE_NAME;
        leaveDetails.employeeName = sessionEmployeeName;
        const startDate = leaveDetails.startDate;
        const endDate = leaveDetails.endDate ?? startDate;

        if (!ALLOW_PAST_DATES && dateParser.isPastDate(startDate)) {
          response = '❌ Cannot apply leave for past dates. Please choose a future date or contact your manager for assistance.';
          break;
        }

        leaveDetails.leaveType = leaveDetails.leaveType || 'CASUAL';
        leaveDetails.reason = leaveDetails.reason && leaveDetails.reason.trim().length > 0 ? leaveDetails.reason : 'Personal';

        const overlapCheck = await salesforceService.checkLeaveOverlap(sessionEmployeeName, startDate, endDate);
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
        pendingDetails.employeeName = sessionEmployeeName;
        const effectiveDuration = pendingDetails.isHalfDay ? 0.5 : (pendingDetails.durationDays ?? dateParser.calculateInclusiveDays(startDate, endDate, false));
        const formattedDuration = Number.isFinite(effectiveDuration)
          ? (Number.isInteger(effectiveDuration) ? `${effectiveDuration}` : effectiveDuration.toFixed(1))
          : '1';
        const durationLabel = pendingDetails.isHalfDay ? 'Half day' : `${formattedDuration} day${effectiveDuration === 1 ? '' : 's'}`;

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
        wfhDetails.employeeName = contextManager.getEmployeeName(sessionId) || wfhDetails.employeeName || DEFAULT_EMPLOYEE_NAME;
        
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

      case 'holiday_list': {
        // Dynamically load holidays from holidays.json
        type Holiday = { date: string; name: string; type: string; optional?: boolean };
        type Notes = { [key: string]: string };
        let holidaysList: Holiday[] = [];
        let notes: Notes = {};
        let companyName = 'the company';
        try {
          const holidaysData = fs.readFileSync(path.join(__dirname, '../../data/holidays.json'), 'utf-8');
          const holidaysJson = JSON.parse(holidaysData);
          holidaysList = holidaysJson.holidays || [];
          notes = holidaysJson.notes || {};
          companyName = holidaysJson.companyName || 'the company';
        } catch (e) {
          console.error('Failed to load holidays.json:', e);
        }

        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Filter holidays for this month and year
        const holidaysThisMonth = holidaysList.filter((h: Holiday) => {
          const [y, m] = h.date.split('-');
          return Number(y) === currentYear && Number(m) === currentMonth;
        });

        let holidayMsg = `🎉 **${companyName} Holidays for ${now.toLocaleString('default', { month: 'long' })} ${currentYear}**\n`;
        if (holidaysThisMonth.length === 0) {
          holidayMsg += '\nNo official holidays this month.';
        } else {
          holidayMsg += '\n';
          for (const h of holidaysThisMonth) {
            holidayMsg += `• ${h.date} - ${h.name}${h.optional ? ' (Optional)' : ''}\n`;
          }
        }
        if (notes && notes['optionalHolidays']) {
          holidayMsg += `\n${notes['optionalHolidays']}`;
        }
        if (notes && notes['workingDays']) {
          holidayMsg += `\nWorking Days: ${notes['workingDays']}`;
        }
        if (notes && notes['weekends']) {
          holidayMsg += `\nWeekends: ${notes['weekends']}`;
        }
        response = holidayMsg;
        break;
      }

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
        fallbackLeaveDetails.employeeName = contextManager.getEmployeeName(sessionId) || fallbackLeaveDetails.employeeName || DEFAULT_EMPLOYEE_NAME;
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
        fallbackWfhDetails.employeeName = contextManager.getEmployeeName(sessionId) || fallbackWfhDetails.employeeName || DEFAULT_EMPLOYEE_NAME;
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