/**
 * Entity Extractor
 * Extracts structured data from natural language messages
 */
export interface WfhDetails {
    date: string | null;
    reason: string | null;
    employeeName: string | null;
}
export interface LeaveDetails {
    startDate: string | null;
    endDate: string | null;
    leaveType: string | null;
    reason: string | null;
    employeeName: string | null;
    durationDays?: number | null;
}
export declare class EntityExtractor {
    private leaveTypeKeywords;
    /**
     * Extract WFH details from message
     */
    extractWfhDetails(message: string): WfhDetails;
    /**
     * Extract leave details from message
     */
    extractLeaveDetails(message: string): LeaveDetails;
    /**
     * Extract leave type from message
     */
    private extractLeaveType;
    /**
     * Extract reason from message
     */
    private extractReason;
    /**
     * Clean extracted reason by removing redundant keywords
     */
    private cleanReason;
    /**
     * Get default reason if none could be extracted
     */
    private getDefaultReason;
    /**
     * Extract email from message
     */
    extractEmail(message: string): string | null;
    /**
     * Check if message is asking to edit/correct
     */
    isEditRequest(message: string): boolean;
    /**
     * Check if message is confirming
     */
    isConfirmation(message: string): boolean;
    /**
     * Extract confirmation response (yes/no/unclear)
     */
    extractConfirmation(message: string): 'yes' | 'no' | null;
    /**
     * Check if message is rejecting/declining
     */
    isRejection(message: string): boolean;
    private calculateDurationDays;
}
declare const _default: EntityExtractor;
export default _default;
//# sourceMappingURL=entityExtractor.d.ts.map