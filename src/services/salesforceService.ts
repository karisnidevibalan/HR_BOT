// Mock Salesforce Service for Demo
import jsforce from 'jsforce';

export class SalesforceService {
    private mockDatabase: any[] = [];
    private nextId = 1;
    private demoMode: boolean;
    private conn: any;

    constructor(instanceUrl?: string, accessToken?: string) {
        this.demoMode = process.env.DEMO_MODE === 'true';
        console.log('🔧 Salesforce Service initialized in', this.demoMode ? 'DEMO MODE' : 'LIVE MODE');
        
        // Initialize Salesforce connection for live mode
        if (!this.demoMode) {
            this.conn = new jsforce.Connection({
                loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://test.salesforce.com'
            });
        }
        
        // Pre-populate with test data in demo mode
        if (this.demoMode) {
            this.initializeDemoData();
        }
    }

    private async authenticate(): Promise<boolean> {
        try {
            const username = process.env.SALESFORCE_USERNAME || '';
            const password = process.env.SALESFORCE_PASSWORD || '';
            const token = process.env.SALESFORCE_SECURITY_TOKEN || '';
            
            const userInfo = await this.conn.login(username, password + token);
            
            console.log('✅ Salesforce authentication successful');
            console.log('User ID:', userInfo.id);
            console.log('Org ID:', userInfo.organizationId);
            
            return true;
        } catch (error: any) {
            console.error('❌ Salesforce authentication failed:', error.message);
            return false;
        }
    }

    private initializeDemoData(): void {
        // Add a pre-existing leave for testing overlap detection
        this.mockDatabase.push({
            Id: `LEAVE_${this.nextId++}`,
            Employee_Name__c: 'Current User',
            Employee_Email__c: null,
            Leave_Type__c: 'ANNUAL',
            Start_Date__c: '2025-12-18',
            End_Date__c: '2025-12-22',
            Reason__c: 'Christmas vacation',
            Status__c: 'Approved',
            Created_Date__c: new Date().toISOString(),
            Manager_Approval__c: true
        });
        console.log('📋 Demo data initialized: 1 existing leave record (18-22 Dec 2025)');
    }

    async createLeaveRecord(leaveRequest: any): Promise<any> {
        if (this.demoMode) {
            return this.createMockLeaveRecord(leaveRequest);
        }
        
        // Real Salesforce implementation
        return this.createRealLeaveRecord(leaveRequest);
    }

    private async createRealLeaveRecord(leaveData: any): Promise<any> {
        try {
            // Authenticate first
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }

            // Map leave types to Salesforce picklist values
            const leaveTypeMap: { [key: string]: string } = {
                'ANNUAL': 'Annual Leave',
                'SICK': 'Sick Leave',
                'CASUAL': 'Casual Leave',
                'MATERNITY': 'Maternity Leave',
                'PATERNITY': 'Paternity Leave'
            };
            
            const sfLeaveType = leaveTypeMap[leaveData.leaveType] || 'Casual Leave';
            
            // Create Leave record in Salesforce
            const recordData: any = {
                Employee_Name__c: leaveData.employeeName,
                Leave_Type__c: sfLeaveType,
                Start_Date__c: leaveData.startDate,
                End_Date__c: leaveData.endDate,
                Reason__c: leaveData.reason,
                Status__c: 'Pending',
                Request_Source__c: 'Chatbot'
            };
            
            // Add email if provided
            if (leaveData.employeeEmail) {
                recordData.Employee_Email__c = leaveData.employeeEmail;
                console.log('✅ Email added to record:', leaveData.employeeEmail);
            } else {
                console.log('⚠️ No employee email provided in leaveData');
            }
            
            const result = await this.conn.sobject('Leave_Request__c').create(recordData);

            console.log('✅ Real Salesforce Leave Record Created:', result.id);
            console.log('📋 Salesforce will handle email notifications via Flow/Process Builder');
            
            return {
                success: true,
                id: result.id,
                salesforceId: result.id,
                record: result
            };
            
        } catch (error: any) {
            console.error('❌ Salesforce Leave Record Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    private async createMockLeaveRecord(leaveData: any): Promise<any> {
        const record = {
            Id: `LEAVE_${this.nextId++}`,
            Employee_Name__c: leaveData.employeeName,
            Employee_Email__c: leaveData.employeeEmail || null,
            Leave_Type__c: leaveData.leaveType,
            Start_Date__c: leaveData.startDate,
            End_Date__c: leaveData.endDate,
            Reason__c: leaveData.reason,
            Status__c: 'Pending Approval',
            Created_Date__c: new Date().toISOString(),
            Manager_Approval__c: false
        };

        this.mockDatabase.push(record);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('✅ Mock Leave Record Created:', record.Id);
        console.log('📋 Note: Email notifications handled by Salesforce Flow/Process Builder');
        
        // NO EMAIL SENDING FROM BOT - Salesforce handles manager notifications
        return { success: true, id: record.Id, record };
    }

    async createWfhRecord(wfhRequest: any): Promise<any> {
        if (this.demoMode) {
            return this.createMockWFHRecord(wfhRequest);
        }
        
        // Real Salesforce implementation
        return this.createRealWFHRecord(wfhRequest);
    }

    private async createRealWFHRecord(wfhData: any): Promise<any> {
        try {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }

            // WFH requests are stored as Leave_Request__c with type 'Work From Home'
            const recordData: any = {
                Employee_Name__c: wfhData.employeeName,
                Leave_Type__c: 'Work From Home',
                Start_Date__c: wfhData.date,
                End_Date__c: wfhData.date,
                Reason__c: wfhData.reason,
                Status__c: 'Pending',
                Request_Source__c: 'Chatbot'
            };

            if (wfhData.employeeEmail) {
                recordData.Employee_Email__c = wfhData.employeeEmail;
            }

            const result = await this.conn.sobject('Leave_Request__c').create(recordData);

            console.log('✅ Real Salesforce WFH Record Created:', result.id);
            console.log('📋 Salesforce will handle email notifications via Flow/Process Builder');

            return {
                success: true,
                id: result.id,
                salesforceId: result.id,
                record: result
            };

        } catch (error: any) {
            console.error('❌ Salesforce WFH Record Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    private async createMockWFHRecord(wfhData: any): Promise<any> {
        // WFH is auto-approved for everyone in demo
        const record = {
            Id: `WFH_${this.nextId++}`,
            Employee_Name__c: wfhData.employeeName,
            Employee_Email__c: wfhData.employeeEmail || null,
            Work_From_Home_Date__c: wfhData.date,
            Reason__c: wfhData.reason,
            Status__c: 'Approved', // Auto-approve WFH in demo
            Created_Date__c: new Date().toISOString(),
            Manager_Approval__c: true
        };

        this.mockDatabase.push(record);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('✅ Mock WFH Record Created:', record.Id);
        console.log('📋 Note: Email notifications handled by Salesforce Flow/Process Builder');
        
        // NO EMAIL SENDING FROM BOT - Salesforce handles manager notifications
        return { success: true, id: record.Id, record };
    }

    async getRecord(recordId: string): Promise<any> {
        if (this.demoMode) {
            return this.getMockRecord(recordId);
        }
        
        // Real Salesforce query
        return this.getRealRecord(recordId);
    }

    private getMockRecord(recordId: string): any {
        const record = this.mockDatabase.find(r => r.Id === recordId);
        
        if (record) {
            return { success: true, record };
        } else {
            return { success: false, message: 'Record not found' };
        }
    }

    private async getRealRecord(recordId: string): Promise<any> {
        try {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }

            console.log(`🔍 Querying Salesforce for record: ${recordId}`);

            const result = await this.conn.sobject('Leave_Request__c').retrieve(recordId);

            if (result && result.Id) {
                console.log(`✅ Record found:`, result);
                return { success: true, record: result };
            } else {
                console.log(`❌ Record not found: ${recordId}`);
                return { success: false, message: 'Record not found' };
            }

        } catch (error: any) {
            console.error('❌ Salesforce query error:', error);
            return { success: false, message: error.message };
        }
    }

    getAllRecords(): any[] {
        return this.mockDatabase;
    }

    // Update record status (for manager approval)
    async updateRecordStatus(recordId: string, status: string): Promise<any> {
        if (this.demoMode) {
            return this.updateMockRecordStatus(recordId, status);
        }
        
        // Real Salesforce update
        return this.updateRealRecordStatus(recordId, status);
    }

    private async updateRealRecordStatus(recordId: string, status: string): Promise<any> {
        try {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }

            // First, update the Status__c field
            await this.conn.sobject('Leave_Request__c').update({
                Id: recordId,
                Status__c: status
            });

            console.log(`✅ Salesforce record ${recordId} updated to ${status}`);

            // Then, process the approval (approve or reject) to trigger the Flow
            try {
                const approvalRequest = {
                    actionType: status === 'Approved' ? 'Approve' : 'Reject',
                    contextActorId: this.conn.userInfo?.id,
                    contextId: recordId,
                    comments: `${status} via HR Chatbot email link`
                };

                const approvalResult = await this.conn.request({
                    method: 'POST',
                    url: '/services/data/v50.0/process/approvals',
                    body: JSON.stringify({
                        requests: [approvalRequest]
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`✅ Approval process ${status.toLowerCase()} - email notification triggered`);
            } catch (approvalError: any) {
                // If there's no active approval process, that's okay - the status update is enough
                console.log(`ℹ️ No active approval process found, status updated only:`, approvalError.message);
            }

            return { success: true, id: recordId, status };

        } catch (error: any) {
            console.error('❌ Salesforce update error:', error);
            return { success: false, error: error.message };
        }
    }

    private updateMockRecordStatus(recordId: string, status: string): any {
        const record = this.mockDatabase.find(r => r.Id === recordId);
        
        if (record) {
            record.Status__c = status;
            record.Manager_Approval__c = status === 'Approved';
            console.log(`✅ Mock record ${recordId} updated to ${status}`);
            return { success: true, id: recordId, status };
        } else {
            return { success: false, message: 'Record not found' };
        }
    }

    // Check for existing leave that overlaps with requested dates
    async checkLeaveOverlap(employeeName: string, startDate: string, endDate: string): Promise<any> {
        if (this.demoMode) {
            return this.checkMockLeaveOverlap(employeeName, startDate, endDate);
        }
        
        // Real Salesforce overlap check
        return this.checkRealLeaveOverlap(employeeName, startDate, endDate);
    }

    private async checkRealLeaveOverlap(employeeName: string, startDate: string, endDate: string): Promise<any> {
        try {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }

            // Query Salesforce for overlapping leave records
            const query = `
                SELECT Id, Employee_Name__c, Leave_Type__c, Start_Date__c, End_Date__c, Reason__c, Status__c
                FROM Leave_Request__c
                WHERE Employee_Name__c = '${employeeName}'
                AND Status__c != 'Rejected'
                AND (
                    (Start_Date__c <= ${endDate} AND End_Date__c >= ${startDate})
                )
            `;

            const result = await this.conn.query(query);

            if (result.records && result.records.length > 0) {
                return {
                    hasOverlap: true,
                    overlappingLeaves: result.records.map((leave: any) => ({
                        id: leave.Id,
                        leaveType: leave.Leave_Type__c,
                        startDate: leave.Start_Date__c,
                        endDate: leave.End_Date__c,
                        reason: leave.Reason__c,
                        status: leave.Status__c
                    }))
                };
            }

            return { hasOverlap: false, overlappingLeaves: [] };

        } catch (error: any) {
            console.error('❌ Salesforce overlap check error:', error);
            // Return no overlap on error to allow request to proceed
            return { hasOverlap: false, overlappingLeaves: [] };
        }
    }

    private async checkMockLeaveOverlap(employeeName: string, startDate: string, endDate: string): Promise<any> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const requestStart = new Date(startDate);
        const requestEnd = new Date(endDate);
        
        // Find all leave records for this employee
        const employeeLeaves = this.mockDatabase.filter(record => 
            record.Employee_Name__c === employeeName && 
            record.Leave_Type__c && // Has leave type, so it's a leave record
            record.Start_Date__c && 
            record.End_Date__c
        );
        
        // Check for overlaps
        const overlappingLeaves = employeeLeaves.filter(leave => {
            const existingStart = new Date(leave.Start_Date__c);
            const existingEnd = new Date(leave.End_Date__c);
            
            // Check if dates overlap: (StartA <= EndB) and (EndA >= StartB)
            const overlaps = (requestStart <= existingEnd) && (requestEnd >= existingStart);
            
            return overlaps;
        });
        
        if (overlappingLeaves.length > 0) {
            return {
                hasOverlap: true,
                overlappingLeaves: overlappingLeaves.map(leave => ({
                    id: leave.Id,
                    leaveType: leave.Leave_Type__c,
                    startDate: leave.Start_Date__c,
                    endDate: leave.End_Date__c,
                    reason: leave.Reason__c,
                    status: leave.Status__c
                }))
            };
        }
        
        return { hasOverlap: false, overlappingLeaves: [] };
    }

    // Simulate connection test
    async testConnection(): Promise<boolean> {
        console.log('🔍 Testing Salesforce connection (DEMO MODE)...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Demo Salesforce connection successful');
        return true;
    }

    // Get Salesforce connection for email service
    getConnection(): any {
        return this.conn;
    }

    // Check if authenticated
    async ensureAuthenticated(): Promise<boolean> {
        if (this.demoMode) {
            return true;
        }
        return this.authenticate();
    }
}