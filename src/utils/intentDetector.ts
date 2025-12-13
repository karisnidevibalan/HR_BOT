/**
 * Enhanced Intent Detector
 * Provides more accurate intent detection with confidence scoring
 */

export interface IntentResult {
  intent: string;
  confidence: number;
  entities: {
    dates?: string[];
    leaveType?: string;
    reason?: string;
    dateRange?: { start: string; end: string };
  };
}

export class IntentDetector {
  private leaveTypes = ['annual', 'sick', 'casual', 'maternity', 'paternity'];
  
  /**
   * Detect intent from user message with confidence scoring
   */
  detectIntent(message: string): IntentResult {
    const lowerMessage = message.toLowerCase();
    const entities: any = {};
    
    // Priority 1: WFH Detection (most specific)
    if (this.isWfhRequest(lowerMessage)) {
      return {
        intent: 'apply_wfh',
        confidence: this.calculateWfhConfidence(lowerMessage),
        entities: this.extractWfhEntities(message)
      };
    }

    // Priority 2: Leave Application Detection
    if (this.isLeaveRequest(lowerMessage)) {
      return {
        intent: 'apply_leave',
        confidence: this.calculateLeaveConfidence(lowerMessage),
        entities: this.extractLeaveEntities(message)
      };
    }

    // Priority 3: Policy Queries
    if (lowerMessage.includes('holiday') && (lowerMessage.includes('list') || lowerMessage.includes('calendar'))) {
      return { intent: 'holiday_list', confidence: 0.9, entities: {} };
    }

    if (lowerMessage.includes('leave') && lowerMessage.includes('policy')) {
      return { intent: 'leave_policy', confidence: 0.95, entities: {} };
    }

    if (lowerMessage.includes('wfh') && lowerMessage.includes('policy')) {
      return { intent: 'wfh_policy', confidence: 0.95, entities: {} };
    }

    // Priority 4: Leave Balance Query
    if (this.isLeaveBalanceQuery(lowerMessage)) {
      return { intent: 'leave_balance', confidence: 0.85, entities: {} };
    }

    // Default: General Query
    return { intent: 'general_query', confidence: 0.5, entities: {} };
  }

  /**
   * Check if message is a WFH request
   */
  private isWfhRequest(message: string): boolean {
    const wfhKeywords = ['wfh', 'work from home', 'working from home', 'remote work'];
    const hasWfhKeyword = wfhKeywords.some(keyword => message.includes(keyword));
    
    if (!hasWfhKeyword) return false;

    // Exclude policy questions
    const excludePatterns = ['policy', 'what is', 'explain', 'tell me about', 'how many'];
    const isPolicyQuestion = excludePatterns.some(pattern => message.includes(pattern));
    
    return !isPolicyQuestion;
  }

  /**
   * Check if message is a leave request
   */
  private isLeaveRequest(message: string): boolean {
    const hasLeaveKeyword = message.includes('leave') || message.includes('holiday');
    
    if (!hasLeaveKeyword) return false;

    // Exclude WFH mentions
    if (message.includes('wfh') || message.includes('work from home')) return false;

    // Check for application indicators
    const applicationIndicators = [
      'apply', 'want', 'need', 'i have', 'already have', 
      'give me', 'get me', 'take', 'request',
      'yesterday', 'today', 'tomorrow',
      /\b(on|from|for)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})/,
      /\d{1,2}(th|st|nd|rd)/,
      /\d{1,2}[.\-/]\d{1,2}/
    ];

    return applicationIndicators.some(indicator => {
      if (typeof indicator === 'string') {
        return message.includes(indicator);
      } else {
        return indicator.test(message);
      }
    });
  }

  /**
   * Check if message is a leave balance query
   */
  private isLeaveBalanceQuery(message: string): boolean {
    const balanceKeywords = [
      'balance', 'remaining', 'how many', 'left',
      'available', 'check leave', 'leave status'
    ];
    
    const hasLeave = message.includes('leave');
    const hasBalanceKeyword = balanceKeywords.some(keyword => message.includes(keyword));
    
    return hasLeave && hasBalanceKeyword;
  }

  /**
   * Calculate confidence for WFH detection
   */
  private calculateWfhConfidence(message: string): number {
    let confidence = 0.6;
    
    // Increase confidence if date is present
    if (this.hasDateIndicator(message)) confidence += 0.2;
    
    // Increase confidence if reason is present
    if (message.includes('for ') || message.includes('because')) confidence += 0.1;
    
    // Increase confidence for explicit keywords
    if (message.includes('apply for wfh') || message.includes('request wfh')) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate confidence for leave detection
   */
  private calculateLeaveConfidence(message: string): number {
    let confidence = 0.6;
    
    // Increase confidence if leave type is specified
    if (this.leaveTypes.some(type => message.includes(type))) confidence += 0.15;
    
    // Increase confidence if date is present
    if (this.hasDateIndicator(message)) confidence += 0.15;
    
    // Increase confidence if reason is present
    if (message.includes('for ') || message.includes('because')) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Check if message has date indicator
   */
  private hasDateIndicator(message: string): boolean {
    const datePatterns = [
      /\d{1,2}[.\-/]\d{1,2}/,
      /\d{4}-\d{2}-\d{2}/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /\b(today|tomorrow|yesterday)\b/i
    ];
    
    return datePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Extract WFH entities
   */
  private extractWfhEntities(message: string): any {
    const entities: any = {};
    
    // Extract date (basic extraction)
    if (this.hasDateIndicator(message)) {
      entities.hasDate = true;
    }
    
    // Extract reason (text after "for")
    const reasonMatch = message.match(/for\s+(.+?)(?:\s+on|\s+\d|$)/i);
    if (reasonMatch) {
      entities.reason = reasonMatch[1].trim();
    }
    
    return entities;
  }

  /**
   * Extract leave entities
   */
  private extractLeaveEntities(message: string): any {
    const entities: any = {};
    const lowerMessage = message.toLowerCase();
    
    // Extract leave type
    for (const type of this.leaveTypes) {
      if (lowerMessage.includes(type)) {
        entities.leaveType = type.toUpperCase();
        break;
      }
    }
    
    // Smart type inference from context
    if (!entities.leaveType) {
      if (lowerMessage.match(/\b(fever|cold|flu|illness|doctor|hospital|medical|appointment|surgery|unwell|sick|health)\b/)) {
        entities.leaveType = 'SICK';
        entities.inferredType = true;
      } else if (lowerMessage.match(/\b(wedding|marriage|festival|temple|church|mosque|ceremony|function|personal|family|home|urgent|emergency)\b/)) {
        entities.leaveType = 'CASUAL';
        entities.inferredType = true;
      } else if (lowerMessage.match(/\b(vacation|holiday|trip|travel|tour|visit|break|rest)\b/)) {
        entities.leaveType = 'ANNUAL';
        entities.inferredType = true;
      }
    }
    
    // Extract date indicator
    if (this.hasDateIndicator(message)) {
      entities.hasDate = true;
    }
    
    // Extract reason
    const reasonMatch = message.match(/for\s+(.+?)$/i);
    if (reasonMatch) {
      entities.reason = reasonMatch[1].trim();
    }
    
    return entities;
  }

  /**
   * Extract reason from message
   */
  extractReason(message: string, type: 'leave' | 'wfh'): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Pattern 1: "for [reason]"
    const forMatch = message.match(/for\s+(.+?)(?:\s+on|\s+from|\s+\d{1,2}[-/.]\d|$)/i);
    if (forMatch) {
      const reason = forMatch[1].trim();
      // Validate reason (not just keywords)
      if (reason.length > 3 && !reason.match(/^(leave|wfh|work|from|home|apply)$/i)) {
        return reason;
      }
    }
    
    // Pattern 2: "because [reason]"
    const becauseMatch = message.match(/because\s+(.+?)$/i);
    if (becauseMatch) {
      return becauseMatch[1].trim();
    }
    
    // Pattern 3: Infer from context keywords
    if (type === 'leave') {
      const contextKeywords = {
        'sick': 'Medical reasons',
        'fever': 'Fever/illness',
        'doctor': 'Doctor appointment',
        'hospital': 'Hospital visit',
        'wedding': 'Family wedding',
        'marriage': 'Marriage ceremony',
        'emergency': 'Emergency situation',
        'personal': 'Personal work',
        'vacation': 'Vacation',
        'trip': 'Travel/trip'
      };
      
      for (const [keyword, reason] of Object.entries(contextKeywords)) {
        if (lowerMessage.includes(keyword)) {
          return reason;
        }
      }
    }
    
    return null;
  }
}

export default new IntentDetector();
