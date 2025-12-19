export declare class SalesforceService {
    /**
     * Get all leave requests for an employee by email
     * In demo mode, filter mock records. In live mode, query Salesforce.
     */
    getLeaveRequestsByEmail(employeeEmail: string): Promise<any[]>;
    /**
     * Get all WFH requests for an employee by email
     * In demo mode, filter mock records. In live mode, query Salesforce.
     */
    getWfhRequestsByEmail(employeeEmail: string): Promise<any[]>;
    /**
     * Check if in demo mode (for testing without Salesforce)
     */
    isDemoMode(): boolean;
    private mockLeaveRecords;
    private mockWfhRecords;
    private mockReimbursements;
    private nextId;
    private demoMode;
    private conn;
    private mockLeaveBalances;
    private isAuthenticated;
    constructor(instanceUrl?: string, accessToken?: string);
    private authenticate;
    private initializeDemoData;
    createLeaveRecord(leaveRequest: any): Promise<any>;
    private createRealLeaveRecord;
    private createMockLeaveRecord;
    createWfhRecord(wfhRequest: any): Promise<any>;
    private buildFriendlyNameFromEmail;
    lookupUserByEmail(email: string): Promise<{
        success: boolean;
        user?: {
            id: string;
            name: string;
            email: string;
        };
        error?: string;
        source?: 'salesforce' | 'fallback';
    }>;
    private createRealWFHRecord;
    private createMockWFHRecord;
    getRecord(recordId: string): Promise<any>;
    private getMockRecord;
    private getRealRecord;
    getAllRecords(): any[];
    getLeaveBalance(employeeEmail: string | undefined, leaveType: string): Promise<{
        total: number;
        used: number;
        remaining: number;
        leaveType: string;
    }>;
    checkLeaveBalance(employeeEmail: string | undefined, leaveType: string, requestedDays: number): Promise<{
        total: number;
        used: number;
        remaining: number;
        leaveType: string;
        isAvailable: boolean;
    }>;
    updateRecordStatus(recordId: string, status: string): Promise<any>;
    private updateRealRecordStatus;
    private updateMockRecordStatus;
    checkLeaveOverlap(employeeName: string, startDate: string, endDate: string): Promise<any>;
    private checkRealLeaveOverlap;
    private applyMockLeaveUsage;
    private toSoqlDateLiteral;
    private buildWfhRecordName;
    private lookupUserIdByEmail;
    private isMissingRecordError;
    private calculateDurationInDays;
    private restoreMockLeaveUsage;
    private getMockLeaveBalance;
    private checkMockLeaveOverlap;
    testConnection(): Promise<boolean>;
    getConnection(): any;
    ensureAuthenticated(): Promise<boolean>;
}
//# sourceMappingURL=salesforceService.d.ts.map