"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesforceService = void 0;
// Mock Salesforce Service for Demo
const jsforce_1 = __importDefault(require("jsforce"));
class SalesforceService {
    /**
     * Get all leave requests for an employee by email
     * In demo mode, filter mock records. In live mode, query Salesforce.
     */
    async getLeaveRequestsByEmail(employeeEmail) {
        if (this.demoMode) {
            // Filter mock leave records by email (case-insensitive)
            return this.mockLeaveRecords.filter(r => r.Employee_Email__c && r.Employee_Email__c.toLowerCase() === employeeEmail.toLowerCase());
        }
        try {
            const result = await this.conn.query(`
                    SELECT Id, Start_Date__c, End_Date__c, Leave_Type__c, Status__c, Reason__c, Duration_Days__c, CreatedDate
                    FROM Leave_Request__c
                    WHERE Employee__c IN (
                        SELECT Id FROM User WHERE Email = '${employeeEmail.toLowerCase()}'
                    )
                    ORDER BY CreatedDate DESC
                    LIMIT 20
                `);
            return result.records || [];
        }
        catch (error) {
            console.error('Error fetching leave requests:', error);
            return [];
        }
    }
    /**
     * Get all WFH requests for an employee by email
     * In demo mode, filter mock records. In live mode, query Salesforce.
     */
    async getWfhRequestsByEmail(employeeEmail) {
        if (this.demoMode) {
            // Filter mock WFH records by email (case-insensitive)
            return this.mockWfhRecords.filter(r => r.email__c && r.email__c.toLowerCase() === employeeEmail.toLowerCase());
        }
        try {
            const result = await this.conn.query(`
                    SELECT Id, Start_Date__c, End_Date__c, Status__c, Reason__c, CreatedDate
                    FROM WFH_Request__c
                    WHERE Employee__c IN (
                        SELECT Id FROM User WHERE Email = '${employeeEmail.toLowerCase()}'
                    )
                    ORDER BY CreatedDate DESC
                    LIMIT 20
                `);
            return result.records || [];
        }
        catch (error) {
            console.error('Error fetching WFH requests:', error);
            return [];
        }
    }
    /**
     * Check if in demo mode (for testing without Salesforce)
     */
    isDemoMode() {
        return this.demoMode;
    }
    constructor(instanceUrl, accessToken) {
        this.mockLeaveRecords = [];
        this.mockWfhRecords = [];
        this.mockReimbursements = [];
        this.nextId = 1;
        this.isAuthenticated = false;
        const hasCredentials = Boolean(process.env.SALESFORCE_USERNAME &&
            process.env.SALESFORCE_PASSWORD &&
            process.env.SALESFORCE_SECURITY_TOKEN);
        this.demoMode = process.env.DEMO_MODE === 'true' || !hasCredentials;
        if (!hasCredentials && process.env.DEMO_MODE !== 'true') {
            console.log('ℹ️ Salesforce credentials not found. Falling back to DEMO MODE.');
        }
        console.log('🔧 Salesforce Service initialized in', this.demoMode ? 'DEMO MODE' : 'LIVE MODE');
        this.mockLeaveBalances = {
            'ANNUAL': { total: 21, used: 0 },
            'CASUAL': { total: 12, used: 0 },
            'SICK': { total: 12, used: 0 },
            'MATERNITY': { total: 180, used: 0 },
            'PATERNITY': { total: 15, used: 0 }
        };
        // Initialize Salesforce connection for live mode
        if (!this.demoMode) {
            this.conn = new jsforce_1.default.Connection({
                loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://test.salesforce.com',
                version: '61.0'
            });
        }
        // Pre-populate with test data in demo mode
        if (this.demoMode) {
            this.initializeDemoData();
        }
    }
    async authenticate() {
        try {
            const username = process.env.SALESFORCE_USERNAME || '';
            const password = process.env.SALESFORCE_PASSWORD || '';
            const token = process.env.SALESFORCE_SECURITY_TOKEN || '';
            const userInfo = await this.conn.login(username, password + token);
            console.log('✅ Salesforce authentication successful');
            console.log('User ID:', userInfo.id);
            console.log('Org ID:', userInfo.organizationId);
            this.isAuthenticated = true;
            return true;
        }
        catch (error) {
            console.error('❌ Salesforce authentication failed:', error.message);
            this.isAuthenticated = false;
            return false;
        }
    }
    initializeDemoData() {
        // Add a pre-existing leave for testing overlap detection
        this.mockLeaveRecords.push({
            Id: `LEAVE_${this.nextId++}`,
            Employee__c: null,
            Employee_Name__c: 'Current User',
            Employee_Email__c: null,
            Name: 'Current User',
            Leave_Type__c: 'ANNUAL',
            Type__c: 'Leave',
            Start_Date__c: '2025-12-18',
            End_Date__c: '2025-12-22',
            Reason__c: 'Christmas vacation',
            Status__c: 'Approved',
            Created_Date__c: new Date().toISOString(),
            Manager_Approval__c: true
        });
        this.applyMockLeaveUsage('ANNUAL', '2025-12-18', '2025-12-22');
        console.log('📋 Demo data initialized: 1 existing leave record (18-22 Dec 2025)');
    }
    async createLeaveRecord(leaveRequest) {
        if (this.demoMode) {
            return this.createMockLeaveRecord(leaveRequest);
        }
        // Real Salesforce implementation
        return this.createRealLeaveRecord(leaveRequest);
    }
    async createRealLeaveRecord(leaveData) {
        try {
            // Authenticate first
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }
            // Map leave types to Salesforce picklist values
            const leaveTypeMap = {
                'ANNUAL': 'Annual Leave',
                'SICK': 'Sick Leave',
                'CASUAL': 'Casual Leave',
                'MATERNITY': 'Maternity Leave',
                'PATERNITY': 'Paternity Leave'
            };
            const sfLeaveType = leaveTypeMap[leaveData.leaveType] || 'Casual Leave';
            // Create Leave record in Salesforce
            const recordData = {
                Employee__c: leaveData.employeeId || null,
                Employee_Email__c: leaveData.employeeEmail || null,
                Employee_Name__c: leaveData.employeeName,
                Leave_Type__c: sfLeaveType,
                Start_Date__c: leaveData.startDate,
                End_Date__c: leaveData.endDate,
                Reason__c: leaveData.reason,
                Status__c: 'Pending',
                Request_Source__c: 'Chatbot'
            };
            const result = await this.conn.sobject('Leave_Request__c').create(recordData);
            console.log('✅ Real Salesforce Leave Record Created:', result.id);
            console.log('📋 Salesforce will handle email notifications via Flow/Process Builder');
            return {
                success: true,
                id: result.id,
                salesforceId: result.id,
                record: result
            };
        }
        catch (error) {
            console.error('❌ Salesforce Leave Record Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async createMockLeaveRecord(leaveData) {
        const record = {
            Id: `LEAVE_${this.nextId++}`,
            Employee__c: leaveData.employeeId || null,
            Employee_Name__c: leaveData.employeeName,
            Employee_Email__c: leaveData.employeeEmail || null,
            Name: leaveData.employeeName || 'Leave Request',
            Leave_Type__c: leaveData.leaveType,
            Start_Date__c: leaveData.startDate,
            End_Date__c: leaveData.endDate,
            Reason__c: leaveData.reason,
            Status__c: 'Pending Approval',
            Created_Date__c: new Date().toISOString(),
            Manager_Approval__c: false
        };
        this.mockLeaveRecords.push(record);
        this.applyMockLeaveUsage(leaveData.leaveType, leaveData.startDate, leaveData.endDate);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Mock Leave Record Created:', record.Id);
        console.log('📋 Note: Email notifications handled by Salesforce Flow/Process Builder');
        // NO EMAIL SENDING FROM BOT - Salesforce handles manager notifications
        return { success: true, id: record.Id, record };
    }
    async createWfhRecord(wfhRequest) {
        if (this.demoMode) {
            return this.createMockWFHRecord(wfhRequest);
        }
        // Real Salesforce implementation
        return this.createRealWFHRecord(wfhRequest);
    }
    buildFriendlyNameFromEmail(email) {
        const localPart = email.split('@')[0] || 'user';
        return localPart
            .split(/[._-]/)
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ') || 'Demo User';
    }
    async lookupUserByEmail(email) {
        const normalizedEmail = (email || '').trim();
        if (!normalizedEmail) {
            return { success: false, error: 'Email is required' };
        }
        const friendlyName = this.buildFriendlyNameFromEmail(normalizedEmail.toLowerCase());
        if (this.demoMode) {
            return {
                success: true,
                user: {
                    id: `005DEMO${this.nextId++}`,
                    name: friendlyName,
                    email: normalizedEmail.toLowerCase()
                },
                source: 'fallback'
            };
        }
        try {
            if (!this.isAuthenticated) {
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    throw new Error('Unable to authenticate with Salesforce for user lookup');
                }
            }
            const escapedEmail = normalizedEmail.replace(/'/g, "\\'");
            const query = `SELECT Id, Name, Email FROM User WHERE Email = '${escapedEmail}' LIMIT 1`;
            const result = await this.conn.query(query);
            if (Array.isArray(result.records) && result.records.length === 1) {
                const user = result.records[0];
                return {
                    success: true,
                    user: {
                        id: user.Id,
                        name: user.Name,
                        email: user.Email
                    },
                    source: 'salesforce'
                };
            }
            return {
                success: true,
                user: {
                    id: `005DEMO${this.nextId++}`,
                    name: friendlyName,
                    email: normalizedEmail.toLowerCase()
                },
                source: 'fallback'
            };
        }
        catch (error) {
            console.warn('⚠️ Salesforce user lookup error, using fallback profile:', error?.message || error);
            return {
                success: true,
                user: {
                    id: `005DEMO${this.nextId++}`,
                    name: friendlyName,
                    email: normalizedEmail.toLowerCase()
                },
                error: error?.message,
                source: 'fallback'
            };
        }
    }
    async createRealWFHRecord(wfhData) {
        try {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }
            const normalizedDate = this.toSoqlDateLiteral(wfhData.date);
            if (!normalizedDate) {
                throw new Error('Invalid WFH date provided');
            }
            const employeeId = await this.lookupUserIdByEmail(wfhData.employeeEmail);
            const recordData = {
                Name: this.buildWfhRecordName(wfhData.employeeName, normalizedDate),
                Date__c: normalizedDate,
                Status__c: 'Pending Approval',
                Manager_approval__c: false
            };
            if (wfhData.reason) {
                recordData.Reason__c = wfhData.reason;
            }
            if (wfhData.employeeEmail) {
                recordData.email__c = wfhData.employeeEmail;
            }
            if (employeeId) {
                recordData.Employee__c = employeeId;
            }
            const result = await this.conn.sobject('WFH__c').create(recordData);
            console.log('✅ Real Salesforce WFH Record Created:', result.id);
            console.log('📋 Manager approval flow should be triggered from WFH__c automations');
            return {
                success: true,
                id: result.id,
                salesforceId: result.id,
                record: result
            };
        }
        catch (error) {
            console.error('❌ Salesforce WFH Record Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async createMockWFHRecord(wfhData) {
        // Mirror the new approval workflow even in demo mode
        const normalizedDate = this.toSoqlDateLiteral(wfhData.date) || wfhData.date;
        const generatedName = `WFH - ${wfhData.employeeName || 'Employee'} - ${normalizedDate}`;
        const record = {
            Id: `WFH_${this.nextId++}`,
            Name: generatedName,
            Employee_Name__c: wfhData.employeeName,
            email__c: wfhData.employeeEmail || null,
            Employee__c: wfhData.employeeId || null,
            Date__c: normalizedDate,
            Reason__c: wfhData.reason,
            Status__c: 'Pending Approval',
            Created_Date__c: new Date().toISOString(),
            Manager_approval__c: false
        };
        this.mockWfhRecords.push(record);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('✅ Mock WFH Record Created:', record.Id);
        console.log('📋 Note: Email notifications handled by Salesforce Flow/Process Builder');
        // NO EMAIL SENDING FROM BOT - Salesforce handles manager notifications
        return { success: true, id: record.Id, record };
    }
    async getRecord(recordId) {
        if (this.demoMode) {
            return this.getMockRecord(recordId);
        }
        // Real Salesforce query
        return this.getRealRecord(recordId);
    }
    getMockRecord(recordId) {
        const record = [...this.mockLeaveRecords, ...this.mockWfhRecords, ...this.mockReimbursements].find(r => r.Id === recordId);
        if (record) {
            return { success: true, record };
        }
        else {
            return { success: false, message: 'Record not found' };
        }
    }
    async getRealRecord(recordId) {
        try {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }
            console.log(`🔍 Querying Salesforce for record: ${recordId}`);
            const candidateObjects = ['Leave_Request__c', 'WFH__c'];
            for (const objectName of candidateObjects) {
                try {
                    const result = await this.conn.sobject(objectName).retrieve(recordId);
                    if (result && result.Id) {
                        console.log(`✅ Record found in ${objectName}:`, result);
                        return { success: true, record: result };
                    }
                }
                catch (objectError) {
                    if (!this.isMissingRecordError(objectError)) {
                        console.error(`❌ Salesforce query error for ${objectName}:`, objectError);
                        return { success: false, message: objectError.message };
                    }
                    // Not found in this object, continue to next
                }
            }
            console.log(`❌ Record not found: ${recordId}`);
            return { success: false, message: 'Record not found' };
        }
        catch (error) {
            console.error('❌ Salesforce query error:', error);
            return { success: false, message: error.message };
        }
    }
    getAllRecords() {
        return [...this.mockLeaveRecords, ...this.mockWfhRecords, ...this.mockReimbursements];
    }
    async getLeaveBalance(employeeEmail, leaveType) {
        if (this.demoMode) {
            return this.getMockLeaveBalance(leaveType);
        }
        // TODO: Replace with real Salesforce integration
        return this.getMockLeaveBalance(leaveType);
    }
    async checkLeaveBalance(employeeEmail, leaveType, requestedDays) {
        const balance = await this.getLeaveBalance(employeeEmail, leaveType);
        return {
            ...balance,
            isAvailable: balance.remaining >= requestedDays
        };
    }
    // Update record status (for manager approval)
    async updateRecordStatus(recordId, status) {
        if (this.demoMode) {
            return this.updateMockRecordStatus(recordId, status);
        }
        // Real Salesforce update
        return this.updateRealRecordStatus(recordId, status);
    }
    async updateRealRecordStatus(recordId, status) {
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
            }
            catch (approvalError) {
                // If there's no active approval process, that's okay - the status update is enough
                console.log(`ℹ️ No active approval process found, status updated only:`, approvalError.message);
            }
            return { success: true, id: recordId, status };
        }
        catch (error) {
            console.error('❌ Salesforce update error:', error);
            return { success: false, error: error.message };
        }
    }
    updateMockRecordStatus(recordId, status) {
        const leaveRecord = this.mockLeaveRecords.find(r => r.Id === recordId);
        if (leaveRecord) {
            leaveRecord.Status__c = status;
            leaveRecord.Manager_Approval__c = status === 'Approved';
            if (status === 'Cancelled' || status === 'Rejected') {
                this.restoreMockLeaveUsage(leaveRecord.Leave_Type__c, leaveRecord.Start_Date__c, leaveRecord.End_Date__c);
            }
            console.log(`✅ Mock leave record ${recordId} updated to ${status}`);
            return { success: true, id: recordId, status };
        }
        const wfhRecord = this.mockWfhRecords.find(r => r.Id === recordId);
        if (wfhRecord) {
            wfhRecord.Status__c = status;
            wfhRecord.Manager_approval__c = status === 'Approved';
            console.log(`✅ Mock WFH record ${recordId} updated to ${status}`);
            return { success: true, id: recordId, status };
        }
        const reimbursement = this.mockReimbursements.find(r => r.Id === recordId);
        if (reimbursement) {
            reimbursement.Status__c = status;
            console.log(`✅ Mock reimbursement ${recordId} updated to ${status}`);
            return { success: true, id: recordId, status };
        }
        return { success: false, message: 'Record not found' };
    }
    // Check for existing leave that overlaps with requested dates
    async checkLeaveOverlap(employeeName, startDate, endDate) {
        if (this.demoMode) {
            return this.checkMockLeaveOverlap(employeeName, startDate, endDate);
        }
        // Real Salesforce overlap check
        return this.checkRealLeaveOverlap(employeeName, startDate, endDate);
    }
    async checkRealLeaveOverlap(employeeName, startDate, endDate) {
        try {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                throw new Error('Salesforce authentication failed');
            }
            // Query Salesforce for overlapping leave records
            const startDateLiteral = this.toSoqlDateLiteral(startDate);
            const endDateLiteral = this.toSoqlDateLiteral(endDate);
            if (!startDateLiteral || !endDateLiteral) {
                console.warn('⚠️ Invalid date supplied for overlap check, skipping query');
                return { hasOverlap: false, overlappingLeaves: [] };
            }
            // Use raw SOQL to avoid quoting date fields
            const soql = `SELECT Id, Leave_Type__c, Start_Date__c, End_Date__c, Reason__c, Status__c FROM Leave_Request__c WHERE Employee_Name__c = '${employeeName.replace(/'/g, "\\'")}' AND Status__c != 'Rejected' AND Start_Date__c <= ${endDateLiteral} AND End_Date__c >= ${startDateLiteral} LIMIT 5`;
            const results = await this.conn.query(soql);
            const records = results.records || [];
            if (Array.isArray(records) && records.length > 0) {
                return {
                    hasOverlap: true,
                    overlappingLeaves: records.map((leave) => ({
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
            if (Array.isArray(results) && results.length > 0) {
                return {
                    hasOverlap: true,
                    overlappingLeaves: results.map((leave) => ({
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
        catch (error) {
            console.error('❌ Salesforce overlap check error:', error);
            // Return no overlap on error to allow request to proceed
            return { hasOverlap: false, overlappingLeaves: [] };
        }
    }
    applyMockLeaveUsage(leaveType, startDate, endDate) {
        if (!leaveType || !startDate) {
            return;
        }
        const key = leaveType.toUpperCase();
        if (!this.mockLeaveBalances[key]) {
            this.mockLeaveBalances[key] = { total: 12, used: 0 };
        }
        const duration = this.calculateDurationInDays(startDate, endDate || startDate);
        if (duration <= 0) {
            return;
        }
        const balance = this.mockLeaveBalances[key];
        balance.used = Math.min(balance.total, balance.used + duration);
    }
    toSoqlDateLiteral(inputDate) {
        if (!inputDate) {
            return null;
        }
        const parsed = new Date(inputDate);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        const isoDate = parsed.toISOString().split('T')[0];
        return isoDate.replace(/[^0-9-]/g, '') || null;
    }
    buildWfhRecordName(employeeName, isoDate) {
        const trimmedName = employeeName && employeeName.trim().length > 0 ? employeeName.trim() : 'Employee';
        return `WFH - ${trimmedName} - ${isoDate}`;
    }
    async lookupUserIdByEmail(email) {
        if (!email || this.demoMode || !this.conn) {
            return null;
        }
        try {
            const user = await this.conn.sobject('User').findOne({ Email: email }, ['Id']);
            return user?.Id || null;
        }
        catch (error) {
            console.warn(`⚠️ Unable to resolve Salesforce User for email ${email}:`, error?.message || error);
            return null;
        }
    }
    isMissingRecordError(error) {
        if (!error) {
            return false;
        }
        const normalisedError = Array.isArray(error) ? error[0] : error;
        const code = normalisedError?.errorCode || normalisedError?.code;
        return code === 'NOT_FOUND' || code === 'INVALID_ID_FIELD' || code === 'INVALID_TYPE' || code === 'ENTITY_IS_DELETED';
    }
    calculateDurationInDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return 0;
        }
        const diffInMs = end.getTime() - start.getTime();
        const diffInDays = Math.floor(diffInMs / (24 * 60 * 60 * 1000));
        return diffInDays >= 0 ? diffInDays + 1 : 0;
    }
    restoreMockLeaveUsage(leaveType, startDate, endDate) {
        const key = leaveType?.toUpperCase();
        if (!key || !this.mockLeaveBalances[key]) {
            return;
        }
        const duration = this.calculateDurationInDays(startDate, endDate || startDate);
        if (duration <= 0) {
            return;
        }
        const balance = this.mockLeaveBalances[key];
        balance.used = Math.max(0, balance.used - duration);
    }
    getMockLeaveBalance(leaveType) {
        const key = (leaveType || 'CASUAL').toUpperCase();
        const balance = this.mockLeaveBalances[key] || { total: 12, used: 0 };
        const remaining = Math.max(0, balance.total - balance.used);
        return {
            total: balance.total,
            used: balance.used,
            remaining,
            leaveType: key
        };
    }
    async checkMockLeaveOverlap(employeeName, startDate, endDate) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));
        const requestStart = new Date(startDate);
        const requestEnd = new Date(endDate);
        // Find all leave records for this employee
        const employeeLeaves = this.mockLeaveRecords.filter(record => record.Employee_Name__c === employeeName &&
            record.Leave_Type__c && // Has leave type, so it's a leave record
            record.Start_Date__c &&
            record.End_Date__c);
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
    async testConnection() {
        console.log('🔍 Testing Salesforce connection (DEMO MODE)...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Demo Salesforce connection successful');
        return true;
    }
    // Get Salesforce connection for email service
    getConnection() {
        return this.conn;
    }
    // Check if authenticated
    async ensureAuthenticated() {
        if (this.demoMode) {
            return true;
        }
        return this.authenticate();
    }
}
exports.SalesforceService = SalesforceService;
//# sourceMappingURL=salesforceService.js.map