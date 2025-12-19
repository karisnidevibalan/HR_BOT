export interface IntentResult {
    intent: string;
    confidence: number;
    entities: {
        dates?: string[];
        leaveType?: string;
        reason?: string;
        dateRange?: {
            start: string;
            end: string;
        };
    };
}
export declare class IntentDetector {
    private leaveTypes;
    detectIntent(message: string): IntentResult;
    private isWfhRequest;
    private isLeaveRequest;
    private extractWfhEntities;
    private extractLeaveEntities;
}
declare const _default: IntentDetector;
export default _default;
//# sourceMappingURL=intentDetector.d.ts.map