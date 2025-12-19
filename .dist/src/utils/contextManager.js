"use strict";
/**
 * Conversation Context Manager
 * Manages session state and conversation flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
class ContextManager {
    constructor() {
        this.contexts = new Map();
        this.MAX_HISTORY = 10;
        this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    }
    /**
     * Get or create session context
     */
    getContext(sessionId) {
        if (!this.contexts.has(sessionId)) {
            this.contexts.set(sessionId, {
                sessionId,
                conversationHistory: []
            });
        }
        return this.contexts.get(sessionId);
    }
    /**
     * Update session context
     */
    updateContext(sessionId, updates) {
        const context = this.getContext(sessionId);
        Object.assign(context, updates);
        this.contexts.set(sessionId, context);
    }
    /**
     * Add message to conversation history
     */
    addToHistory(sessionId, message, intent) {
        const context = this.getContext(sessionId);
        if (!context.conversationHistory) {
            context.conversationHistory = [];
        }
        context.conversationHistory.push({
            timestamp: new Date(),
            message,
            intent
        });
        // Keep only last MAX_HISTORY messages
        if (context.conversationHistory.length > this.MAX_HISTORY) {
            context.conversationHistory = context.conversationHistory.slice(-this.MAX_HISTORY);
        }
        this.contexts.set(sessionId, context);
    }
    /**
     * Get recent conversation history
     */
    getHistory(sessionId, count = 5) {
        const context = this.getContext(sessionId);
        if (!context.conversationHistory)
            return [];
        return context.conversationHistory.slice(-count);
    }
    /**
     * Check if user email is set
     */
    hasUserEmail(sessionId) {
        const context = this.getContext(sessionId);
        return !!context.userEmail;
    }
    /**
     * Get user email
     */
    getUserEmail(sessionId) {
        const context = this.getContext(sessionId);
        return context.userEmail;
    }
    /**
     * Set user email
     */
    setUserEmail(sessionId, email) {
        const normalized = email.trim();
        this.updateContext(sessionId, {
            userEmail: normalized,
            awaitingEmail: false,
            emailAttempts: 0,
            emailVerificationLocked: false
        });
    }
    /**
     * Check if awaiting email
     */
    isAwaitingEmail(sessionId) {
        const context = this.getContext(sessionId);
        return !!context.awaitingEmail && !context.userEmail;
    }
    /**
     * Mark as awaiting email
     */
    setAwaitingEmail(sessionId) {
        this.updateContext(sessionId, { awaitingEmail: true, emailAttempts: 0, emailVerificationLocked: false });
    }
    getEmailAttempts(sessionId) {
        const context = this.getContext(sessionId);
        return context.emailAttempts ?? 0;
    }
    incrementEmailAttempts(sessionId) {
        const context = this.getContext(sessionId);
        const next = (context.emailAttempts ?? 0) + 1;
        context.emailAttempts = next;
        this.contexts.set(sessionId, context);
        return next;
    }
    resetEmailAttempts(sessionId) {
        const context = this.getContext(sessionId);
        context.emailAttempts = 0;
        this.contexts.set(sessionId, context);
    }
    setEmailVerificationLocked(sessionId, locked) {
        const context = this.getContext(sessionId);
        context.emailVerificationLocked = locked;
        this.contexts.set(sessionId, context);
    }
    isEmailVerificationLocked(sessionId) {
        const context = this.getContext(sessionId);
        return context.emailVerificationLocked === true;
    }
    setEmployeeProfile(sessionId, profile) {
        this.updateContext(sessionId, {
            userEmail: profile.email,
            userName: profile.name,
            employeeName: profile.name,
            employeeId: profile.id,
            awaitingEmail: false,
            emailAttempts: 0,
            emailVerificationLocked: false
        });
    }
    clearEmployeeProfile(sessionId) {
        const context = this.getContext(sessionId);
        delete context.employeeId;
        delete context.employeeName;
        delete context.userName;
        delete context.userEmail;
        context.awaitingEmail = true;
        context.emailAttempts = 0;
        context.emailVerificationLocked = false;
        this.contexts.set(sessionId, context);
    }
    getEmployeeId(sessionId) {
        const context = this.getContext(sessionId);
        return context.employeeId;
    }
    getEmployeeName(sessionId) {
        const context = this.getContext(sessionId);
        return context.employeeName || context.userName;
    }
    /**
     * Save last request for editing
     */
    saveLastRequest(sessionId, request) {
        this.updateContext(sessionId, { lastRequest: request });
    }
    /**
     * Get last request
     */
    getLastRequest(sessionId) {
        const context = this.getContext(sessionId);
        return context.lastRequest;
    }
    /**
     * Clear last request
     */
    clearLastRequest(sessionId) {
        this.updateContext(sessionId, { lastRequest: undefined });
    }
    /**
     * Save leave conflict
     */
    saveLeaveConflict(sessionId, conflict) {
        this.updateContext(sessionId, { leaveConflict: conflict });
    }
    /**
     * Get leave conflict
     */
    getLeaveConflict(sessionId) {
        const context = this.getContext(sessionId);
        return context.leaveConflict;
    }
    /**
     * Clear leave conflict
     */
    clearLeaveConflict(sessionId) {
        this.updateContext(sessionId, { leaveConflict: undefined });
    }
    /**
     * Set awaiting leave details
     */
    setAwaitingLeaveDetails(sessionId, details) {
        this.updateContext(sessionId, { awaitingLeaveDetails: details });
    }
    /**
     * Get awaiting leave details
     */
    getAwaitingLeaveDetails(sessionId) {
        const context = this.getContext(sessionId);
        return context.awaitingLeaveDetails;
    }
    /**
     * Clear awaiting leave details
     */
    clearAwaitingLeaveDetails(sessionId) {
        this.updateContext(sessionId, { awaitingLeaveDetails: undefined });
    }
    /**
     * Check if in follow-up conversation
     */
    isInFollowUp(sessionId) {
        const context = this.getContext(sessionId);
        return !!context.awaitingLeaveDetails || !!context.leaveConflict;
    }
    /**
     * Clear session context
     */
    clearContext(sessionId) {
        this.contexts.delete(sessionId);
    }
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [sessionId, context] of this.contexts.entries()) {
            if (!context.conversationHistory || context.conversationHistory.length === 0) {
                continue;
            }
            const lastActivity = context.conversationHistory[context.conversationHistory.length - 1].timestamp;
            const timeSinceLastActivity = now - lastActivity.getTime();
            if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
                this.contexts.delete(sessionId);
                console.log(`🧹 Cleaned up expired session: ${sessionId}`);
            }
        }
    }
    /**
     * Set pending confirmation
     */
    setPendingConfirmation(sessionId, type, details) {
        const context = this.getContext(sessionId);
        context.pendingConfirmation = { type, details };
        this.contexts.set(sessionId, context);
    }
    /**
     * Get pending confirmation
     */
    getPendingConfirmation(sessionId) {
        const context = this.getContext(sessionId);
        return context.pendingConfirmation;
    }
    /**
     * Check if awaiting confirmation
     */
    isAwaitingConfirmation(sessionId) {
        const context = this.getContext(sessionId);
        return !!context.pendingConfirmation;
    }
    /**
     * Clear pending confirmation
     */
    clearPendingConfirmation(sessionId) {
        const context = this.getContext(sessionId);
        delete context.pendingConfirmation;
        this.contexts.set(sessionId, context);
    }
    /**
     * Get session statistics
     */
    getSessionStats(sessionId) {
        const context = this.getContext(sessionId);
        return {
            sessionId,
            hasEmail: !!context.userEmail,
            historyCount: context.conversationHistory?.length || 0,
            isInFollowUp: this.isInFollowUp(sessionId),
            hasLastRequest: !!context.lastRequest,
            hasConflict: !!context.leaveConflict,
            awaitingConfirmation: !!context.pendingConfirmation
        };
    }
}
exports.ContextManager = ContextManager;
exports.default = new ContextManager();
//# sourceMappingURL=contextManager.js.map