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
    details: any; // LeaveDetails or WfhDetails
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

export class ContextManager {
  private contexts: Map<string, SessionContext> = new Map();
  private readonly MAX_HISTORY = 10;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Get or create session context
   */
  getContext(sessionId: string): SessionContext {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, {
        sessionId,
        conversationHistory: []
      });
    }
    return this.contexts.get(sessionId)!;
  }

  /**
   * Update session context
   */
  updateContext(sessionId: string, updates: Partial<SessionContext>): void {
    const context = this.getContext(sessionId);
    Object.assign(context, updates);
    this.contexts.set(sessionId, context);
  }

  /**
   * Add message to conversation history
   */
  addToHistory(sessionId: string, message: string, intent: string): void {
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
  getHistory(sessionId: string, count: number = 5): Array<{ timestamp: Date; message: string; intent: string }> {
    const context = this.getContext(sessionId);
    if (!context.conversationHistory) return [];
    
    return context.conversationHistory.slice(-count);
  }

  /**
   * Check if user email is set
   */
  hasUserEmail(sessionId: string): boolean {
    const context = this.getContext(sessionId);
    return !!context.userEmail;
  }

  /**
   * Get user email
   */
  getUserEmail(sessionId: string): string | undefined {
    const context = this.getContext(sessionId);
    return context.userEmail;
  }

  /**
   * Set user email
   */
  setUserEmail(sessionId: string, email: string): void {
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
  isAwaitingEmail(sessionId: string): boolean {
    const context = this.getContext(sessionId);
    return !!context.awaitingEmail && !context.userEmail;
  }

  /**
   * Mark as awaiting email
   */
  setAwaitingEmail(sessionId: string): void {
    this.updateContext(sessionId, { awaitingEmail: true, emailAttempts: 0, emailVerificationLocked: false });
  }

  getEmailAttempts(sessionId: string): number {
    const context = this.getContext(sessionId);
    return context.emailAttempts ?? 0;
  }

  incrementEmailAttempts(sessionId: string): number {
    const context = this.getContext(sessionId);
    const next = (context.emailAttempts ?? 0) + 1;
    context.emailAttempts = next;
    this.contexts.set(sessionId, context);
    return next;
  }

  resetEmailAttempts(sessionId: string): void {
    const context = this.getContext(sessionId);
    context.emailAttempts = 0;
    this.contexts.set(sessionId, context);
  }

  setEmailVerificationLocked(sessionId: string, locked: boolean): void {
    const context = this.getContext(sessionId);
    context.emailVerificationLocked = locked;
    this.contexts.set(sessionId, context);
  }

  isEmailVerificationLocked(sessionId: string): boolean {
    const context = this.getContext(sessionId);
    return context.emailVerificationLocked === true;
  }

  setEmployeeProfile(sessionId: string, profile: { id: string; name: string; email: string }): void {
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

  clearEmployeeProfile(sessionId: string): void {
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

  getEmployeeId(sessionId: string): string | undefined {
    const context = this.getContext(sessionId);
    return context.employeeId;
  }

  getEmployeeName(sessionId: string): string | undefined {
    const context = this.getContext(sessionId);
    return context.employeeName || context.userName;
  }

  /**
   * Save last request for editing
   */
  saveLastRequest(sessionId: string, request: SessionContext['lastRequest']): void {
    this.updateContext(sessionId, { lastRequest: request });
  }

  /**
   * Get last request
   */
  getLastRequest(sessionId: string): SessionContext['lastRequest'] | undefined {
    const context = this.getContext(sessionId);
    return context.lastRequest;
  }

  /**
   * Clear last request
   */
  clearLastRequest(sessionId: string): void {
    this.updateContext(sessionId, { lastRequest: undefined });
  }

  /**
   * Save leave conflict
   */
  saveLeaveConflict(sessionId: string, conflict: SessionContext['leaveConflict']): void {
    this.updateContext(sessionId, { leaveConflict: conflict });
  }

  /**
   * Get leave conflict
   */
  getLeaveConflict(sessionId: string): SessionContext['leaveConflict'] | undefined {
    const context = this.getContext(sessionId);
    return context.leaveConflict;
  }

  /**
   * Clear leave conflict
   */
  clearLeaveConflict(sessionId: string): void {
    this.updateContext(sessionId, { leaveConflict: undefined });
  }

  /**
   * Set awaiting leave details
   */
  setAwaitingLeaveDetails(sessionId: string, details: SessionContext['awaitingLeaveDetails']): void {
    this.updateContext(sessionId, { awaitingLeaveDetails: details });
  }

  /**
   * Get awaiting leave details
   */
  getAwaitingLeaveDetails(sessionId: string): SessionContext['awaitingLeaveDetails'] | undefined {
    const context = this.getContext(sessionId);
    return context.awaitingLeaveDetails;
  }

  /**
   * Clear awaiting leave details
   */
  clearAwaitingLeaveDetails(sessionId: string): void {
    this.updateContext(sessionId, { awaitingLeaveDetails: undefined });
  }

  /**
   * Check if in follow-up conversation
   */
  isInFollowUp(sessionId: string): boolean {
    const context = this.getContext(sessionId);
    return !!context.awaitingLeaveDetails || !!context.leaveConflict;
  }

  /**
   * Clear session context
   */
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
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
  setPendingConfirmation(sessionId: string, type: 'leave' | 'wfh', details: any): void {
    const context = this.getContext(sessionId);
    context.pendingConfirmation = { type, details };
    this.contexts.set(sessionId, context);
  }

  /**
   * Get pending confirmation
   */
  getPendingConfirmation(sessionId: string): { type: 'leave' | 'wfh'; details: any } | undefined {
    const context = this.getContext(sessionId);
    return context.pendingConfirmation;
  }

  /**
   * Check if awaiting confirmation
   */
  isAwaitingConfirmation(sessionId: string): boolean {
    const context = this.getContext(sessionId);
    return !!context.pendingConfirmation;
  }

  /**
   * Clear pending confirmation
   */
  clearPendingConfirmation(sessionId: string): void {
    const context = this.getContext(sessionId);
    delete context.pendingConfirmation;
    this.contexts.set(sessionId, context);
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): any {
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

export default new ContextManager();
