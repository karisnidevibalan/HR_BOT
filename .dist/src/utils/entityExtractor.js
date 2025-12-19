"use strict";
/**
 * Entity Extractor
 * Extracts structured data from natural language messages
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityExtractor = void 0;
const dateParser_1 = __importDefault(require("../services/dateParser"));
class EntityExtractor {
    constructor() {
        this.leaveTypeKeywords = {
            'annual': 'ANNUAL',
            'sick': 'SICK',
            'casual': 'CASUAL',
            'maternity': 'MATERNITY',
            'paternity': 'PATERNITY'
        };
    }
    /**
     * Extract WFH details from message
     */
    extractWfhDetails(message) {
        const sanitizedForDate = message
            .replace(/work\s+from\s+home/gi, 'wfh')
            .replace(/from\s+home/gi, 'home');
        const date = dateParser_1.default.parseDate(sanitizedForDate);
        // Extract reason - if null, use context-based default
        let reason = this.extractReason(message, 'wfh');
        if (!reason || reason.trim() === '') {
            reason = this.getDefaultReason(message);
        }
        return {
            date,
            reason,
            employeeName: null // To be filled by controller
        };
    }
    /**
     * Extract leave details from message
     */
    extractLeaveDetails(message) {
        // Extract date or date range
        const dateRange = dateParser_1.default.parseDateRange(message);
        let startDate = null;
        let endDate = null;
        let durationDays = null;
        if (dateRange) {
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        }
        else {
            startDate = dateParser_1.default.parseDate(message);
            endDate = startDate;
        }
        const durationMatch = message.match(/(\d{1,3})\s*(?:day|days)\b/i);
        if (durationMatch) {
            const parsed = parseInt(durationMatch[1], 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
                durationDays = parsed;
            }
        }
        // Extract leave type
        const leaveType = this.extractLeaveType(message);
        // Extract reason - if null, use context-based default
        let reason = this.extractReason(message, 'leave');
        if (!reason || reason.trim() === '') {
            reason = this.getDefaultReason(message);
        }
        if (startDate && durationDays && durationDays > 1 && (!endDate || endDate === startDate)) {
            const end = new Date(startDate);
            end.setDate(end.getDate() + durationDays - 1);
            endDate = end.toISOString().split('T')[0];
        }
        if (!durationDays && startDate && endDate) {
            durationDays = this.calculateDurationDays(startDate, endDate);
        }
        return {
            startDate,
            endDate,
            leaveType,
            reason,
            employeeName: null, // To be filled by controller
            durationDays
        };
    }
    /**
     * Extract leave type from message
     */
    extractLeaveType(message) {
        const lowerMessage = message.toLowerCase();
        // Check for explicit leave type mentions
        for (const [keyword, type] of Object.entries(this.leaveTypeKeywords)) {
            if (lowerMessage.includes(keyword)) {
                return type;
            }
        }
        // Smart inference based on context
        // Sick leave indicators
        if (lowerMessage.match(/\b(fever|cold|flu|illness|doctor|hospital|medical|appointment|surgery|unwell|sick|health|cough|pain|headache|stomach|viral|infection)\b/)) {
            return 'SICK';
        }
        // Casual leave indicators (personal, family events, festivals, etc.)
        if (lowerMessage.match(/\b(wedding|marriage|festival|temple|church|mosque|ceremony|function|personal|family|home|urgent|emergency|birthday|anniversary)\b/)) {
            return 'CASUAL';
        }
        // Annual/planned leave indicators (vacation, travel, etc.)
        if (lowerMessage.match(/\b(vacation|holiday|trip|travel|tour|visit|break|rest|relax|beach|mountain)\b/)) {
            return 'ANNUAL';
        }
        // Default to CASUAL if no specific indicators
        return 'CASUAL';
    }
    /**
     * Extract reason from message
     */
    extractReason(message, type) {
        // Pattern 1: "on DATE for REASON" or "DATE for REASON"
        const onDateForMatch = message.match(/\bon\s+\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\s+for\s+(.+?)$/i);
        if (onDateForMatch) {
            return this.cleanReason(onDateForMatch[1].trim(), type);
        }
        const dateForMatch = message.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\s+for\s+(.+?)$/i);
        if (dateForMatch) {
            return this.cleanReason(dateForMatch[1].trim(), type);
        }
        const dateWithMonthForMatch = message.match(/\bon\s+\d{1,2}(th|st|nd|rd)?\s+\w+\s+(?:\d{4}\s+)?for\s+(.+?)$/i);
        if (dateWithMonthForMatch) {
            return this.cleanReason(dateWithMonthForMatch[2].trim(), type);
        }
        // Pattern 2: "for REASON" (anywhere in message)
        const forMatch = message.match(/for\s+(.+?)(?:\s+on|\s+from|\s+\d{1,2}[-/.]\d|$)/i);
        if (forMatch) {
            const cleaned = this.cleanReason(forMatch[1].trim(), type);
            if (cleaned && cleaned.length > 2) {
                return cleaned;
            }
        }
        // Pattern 3: "because REASON"
        const becauseMatch = message.match(/because\s+(.+?)$/i);
        if (becauseMatch) {
            return this.cleanReason(becauseMatch[1].trim(), type);
        }
        // Pattern 4: Extract from context after removing keywords
        const cleanedMessage = this.cleanReason(message, type);
        if (cleanedMessage && cleanedMessage.length > 5 && cleanedMessage.length < 200) {
            return cleanedMessage;
        }
        // If no meaningful reason found, return null to use default
        return null;
    }
    /**
     * Clean extracted reason by removing redundant keywords
     */
    cleanReason(reason, type) {
        let cleaned = reason
            // Remove leave/WFH type keywords
            .replace(/\b(apply|apply for|applying for|request|requesting)\b/gi, '')
            .replace(/\bcreate\b/gi, '')
            .replace(/\bcreate\s+wfh\b/gi, '')
            .replace(/\b(leave|leaves)\b/gi, '')
            .replace(/\b(annual|sick|casual|maternity|paternity)\b/gi, '')
            .replace(/\b(wfh|work from home|working from home)\b/gi, '')
            // Remove date references
            .replace(/\b(today|tomorrow|yesterday|day after tomorrow)\b/gi, '')
            .replace(/\b(this|next|last)\s+(week|month|year)\b/gi, '')
            .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b/g, '')
            .replace(/\b\d{1,2}(th|st|nd|rd)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s*\d{0,4}\b/gi, '')
            .replace(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+\d{1,2}(th|st|nd|rd)?\b/gi, '')
            .replace(/\bon\s+/gi, '')
            .replace(/\bfrom\s+/gi, '')
            // Remove common filler words
            .replace(/\b(i|want|need|to|a|an|the|my|for|at|in|of)\b/gi, '')
            .replace(/\b(please|can|could|would|will|shall)\b/gi, '')
            .replace(/\bmove\s+(to|towards)\b/gi, 'move ')
            // Clean up whitespace
            .replace(/\s+/g, ' ')
            .trim();
        // If cleaned reason is too short or just noise, return null
        if (cleaned.length < 3) {
            return null;
        }
        // Check if it's just generic words without meaning
        const genericWords = ['personal', 'work', 'reason', 'purpose'];
        if (genericWords.includes(cleaned.toLowerCase())) {
            return 'Personal';
        }
        return cleaned;
    }
    /**
     * Get default reason if none could be extracted
     */
    getDefaultReason(message) {
        const lowerMessage = message.toLowerCase();
        // Context-based defaults
        if (lowerMessage.match(/\b(sick|fever|cold|doctor|hospital)\b/)) {
            return 'Medical reasons';
        }
        if (lowerMessage.match(/\b(wedding|marriage)\b/)) {
            return 'Family wedding';
        }
        if (lowerMessage.match(/\b(emergency|urgent)\b/)) {
            return 'Emergency';
        }
        if (lowerMessage.match(/\b(vacation|trip|travel)\b/)) {
            return 'Vacation';
        }
        return 'Personal';
    }
    /**
     * Extract email from message
     */
    extractEmail(message) {
        const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        return emailMatch ? emailMatch[0] : null;
    }
    /**
     * Check if message is asking to edit/correct
     */
    isEditRequest(message) {
        const lowerMessage = message.toLowerCase();
        const editKeywords = ['edit', 'change', 'correct', 'modify', 'update', 'wrong', 'mistake'];
        return editKeywords.some(keyword => lowerMessage.includes(keyword));
    }
    /**
     * Check if message is confirming
     */
    isConfirmation(message) {
        const lowerMessage = message
            .toLowerCase()
            .trim()
            .replace(/[.!?,]/g, '');
        const confirmKeywords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'right', 'confirm', 'proceed'];
        return confirmKeywords.some(keyword => lowerMessage === keyword || lowerMessage.startsWith(keyword + ' '));
    }
    /**
     * Extract confirmation response (yes/no/unclear)
     */
    extractConfirmation(message) {
        const lowerMessage = message
            .toLowerCase()
            .trim()
            .replace(/[.!?,]/g, '');
        // Check for yes
        const confirmKeywords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'right', 'confirm', 'proceed', 'approve'];
        if (confirmKeywords.some(keyword => lowerMessage === keyword || lowerMessage.startsWith(keyword + ' '))) {
            return 'yes';
        }
        // Check for no
        const rejectKeywords = ['no', 'nope', 'nah', 'cancel', 'nevermind', 'never mind', 'stop', 'wrong'];
        if (rejectKeywords.some(keyword => lowerMessage === keyword || lowerMessage.startsWith(keyword + ' '))) {
            return 'no';
        }
        return null;
    }
    /**
     * Check if message is rejecting/declining
     */
    isRejection(message) {
        const lowerMessage = message.toLowerCase().trim();
        const rejectKeywords = ['no', 'nope', 'nah', 'cancel', 'nevermind', 'never mind', 'stop'];
        return rejectKeywords.some(keyword => lowerMessage === keyword || lowerMessage.startsWith(keyword + ' '));
    }
    calculateDurationDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return 1;
        }
        const diffInMs = end.getTime() - start.getTime();
        const diffInDays = Math.floor(diffInMs / (24 * 60 * 60 * 1000));
        return diffInDays >= 0 ? diffInDays + 1 : 1;
    }
}
exports.EntityExtractor = EntityExtractor;
exports.default = new EntityExtractor();
//# sourceMappingURL=entityExtractor.js.map