/**
 * Conversation Context Manager
 * Manages session state and conversation flow
 */
export interface SessionContext {
    sessionId: string;
    userEmail?: string;
    userName?: string;
    employeeId?: string;
    employeeName?: string;
    awaitingEmail?: boolean;
    emailAttempts?: number;
    emailVerificationLocked?: boolean;
    awaitingLeaveDetails?: {
        partialDate?: string;
        clarifiedDate?: string;
        hasConflict?: boolean;
    };
    pendingConfirmation?: {
        type: 'leave' | 'wfh';
        details: any;
    };
    lastRequest?: {
        type: 'leave' | 'wfh';
        recordId?: string;
        leaveType?: string;
        startDate?: string;
        endDate?: string;
        date?: string;
        reason?: string;
    };
    leaveConflict?: {
        existingLeave: any;
        requestedLeave: any;
    };
    conversationHistory?: Array<{
        timestamp: Date;
        message: string;
        intent: string;
    }>;
}
export declare class ContextManager {
    private contexts;
    private readonly MAX_HISTORY;
    private readonly SESSION_TIMEOUT;
    /**
     * Get or create session context
     */
    getContext(sessionId: string): SessionContext;
    /**
     * Update session context
     */
    updateContext(sessionId: string, updates: Partial<SessionContext>): void;
    /**
     * Add message to conversation history
     */
    addToHistory(sessionId: string, message: string, intent: string): void;
    /**
     * Get recent conversation history
     */
    getHistory(sessionId: string, count?: number): Array<{
        timestamp: Date;
        message: string;
        intent: string;
    }>;
    /**
     * Check if user email is set
     */
    hasUserEmail(sessionId: string): boolean;
    /**
     * Get user email
     */
    getUserEmail(sessionId: string): string | undefined;
    /**
     * Set user email
     */
    setUserEmail(sessionId: string, email: string): void;
    /**
     * Check if awaiting email
     */
    isAwaitingEmail(sessionId: string): boolean;
    /**
     * Mark as awaiting email
     */
    setAwaitingEmail(sessionId: string): void;
    getEmailAttempts(sessionId: string): number;
    incrementEmailAttempts(sessionId: string): number;
    resetEmailAttempts(sessionId: string): void;
    setEmailVerificationLocked(sessionId: string, locked: boolean): void;
    isEmailVerificationLocked(sessionId: string): boolean;
    setEmployeeProfile(sessionId: string, profile: {
        id: string;
        name: string;
        email: string;
    }): void;
    clearEmployeeProfile(sessionId: string): void;
    getEmployeeId(sessionId: string): string | undefined;
    getEmployeeName(sessionId: string): string | undefined;
    /**
     * Save last request for editing
     */
    saveLastRequest(sessionId: string, request: SessionContext['lastRequest']): void;
    /**
     * Get last request
     */
    getLastRequest(sessionId: string): SessionContext['lastRequest'] | undefined;
    /**
     * Clear last request
     */
    clearLastRequest(sessionId: string): void;
    /**
     * Save leave conflict
     */
    saveLeaveConflict(sessionId: string, conflict: SessionContext['leaveConflict']): void;
    /**
     * Get leave conflict
     */
    getLeaveConflict(sessionId: string): SessionContext['leaveConflict'] | undefined;
    /**
     * Clear leave conflict
     */
    clearLeaveConflict(sessionId: string): void;
    /**
     * Set awaiting leave details
     */
    setAwaitingLeaveDetails(sessionId: string, details: SessionContext['awaitingLeaveDetails']): void;
    /**
     * Get awaiting leave details
     */
    getAwaitingLeaveDetails(sessionId: string): SessionContext['awaitingLeaveDetails'] | undefined;
    /**
     * Clear awaiting leave details
     */
    clearAwaitingLeaveDetails(sessionId: string): void;
    /**
     * Check if in follow-up conversation
     */
    isInFollowUp(sessionId: string): boolean;
    /**
     * Clear session context
     */
    clearContext(sessionId: string): void;
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): void;
    /**
     * Set pending confirmation
     */
    setPendingConfirmation(sessionId: string, type: 'leave' | 'wfh', details: any): void;
    /**
     * Get pending confirmation
     */
    getPendingConfirmation(sessionId: string): {
        type: 'leave' | 'wfh';
        details: any;
    } | undefined;
    /**
     * Check if awaiting confirmation
     */
    isAwaitingConfirmation(sessionId: string): boolean;
    /**
     * Clear pending confirmation
     */
    clearPendingConfirmation(sessionId: string): void;
    /**
     * Get session statistics
     */
    getSessionStats(sessionId: string): any;
}
declare const _default: ContextManager;
export default _default;
//# sourceMappingURL=contextManager.d.ts.map