// src/utils/intentDetector.ts

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

  detectIntent(message: string): IntentResult {
    const lowerMessage = message.toLowerCase();

    // Check for WFH requests
    if (this.isWfhRequest(lowerMessage)) {
      return {
        intent: 'apply_wfh',
        confidence: 0.9,
        entities: this.extractWfhEntities(message)
      };
    }

    // Check for leave requests
    if (this.isLeaveRequest(lowerMessage)) {
      return {
        intent: 'apply_leave',
        confidence: 0.9,
        entities: this.extractLeaveEntities(message)
      };
    }

    // Default to general query
    return {
      intent: 'general_query',
      confidence: 0.5,
      entities: {}
    };
  }

  private isWfhRequest(message: string): boolean {
    const wfhKeywords = ['wfh', 'work from home', 'working from home'];
    return wfhKeywords.some(keyword => message.includes(keyword));
  }

  private isLeaveRequest(message: string): boolean {
    const leaveKeywords = ['leave', 'day off', 'time off', 'vacation'];
    return leaveKeywords.some(keyword => message.includes(keyword));
  }

  private extractWfhEntities(message: string): any {
    return {
      dates: [new Date().toISOString().split('T')[0]],
      reason: 'Working from home'
    };
  }

  private extractLeaveEntities(message: string): any {
    return {
      leaveType: this.leaveTypes.find(type => message.includes(type)) || 'annual',
      dates: [new Date().toISOString().split('T')[0]],
      reason: 'Personal'
    };
  }
}

// Export a singleton instance
export default new IntentDetector();