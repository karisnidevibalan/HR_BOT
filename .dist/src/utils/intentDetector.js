"use strict";
// src/utils/intentDetector.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentDetector = void 0;
class IntentDetector {
    constructor() {
        this.leaveTypes = ['annual', 'sick', 'casual', 'maternity', 'paternity'];
    }
    detectIntent(message) {
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
    isWfhRequest(message) {
        const wfhKeywords = ['wfh', 'work from home', 'working from home'];
        return wfhKeywords.some(keyword => message.includes(keyword));
    }
    isLeaveRequest(message) {
        const leaveKeywords = ['leave', 'day off', 'time off', 'vacation'];
        return leaveKeywords.some(keyword => message.includes(keyword));
    }
    extractWfhEntities(message) {
        return {
            dates: [new Date().toISOString().split('T')[0]],
            reason: 'Working from home'
        };
    }
    extractLeaveEntities(message) {
        return {
            leaveType: this.leaveTypes.find(type => message.includes(type)) || 'annual',
            dates: [new Date().toISOString().split('T')[0]],
            reason: 'Personal'
        };
    }
}
exports.IntentDetector = IntentDetector;
// Export a singleton instance
exports.default = new IntentDetector();
//# sourceMappingURL=intentDetector.js.map