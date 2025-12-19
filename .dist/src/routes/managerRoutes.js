"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/managerRoutes.ts
const express_1 = __importDefault(require("express"));
const salesforceService_1 = require("../services/salesforceService");
const router = express_1.default.Router();
const salesforceService = new salesforceService_1.SalesforceService();
/**
 * GET /api/manager/requests
 * Fetch all pending/approved requests for manager dashboard
 */
router.get('/requests', async (req, res) => {
    try {
        const managerEmail = req.session?.user?.email; // Get manager email from session
        if (!managerEmail) {
            return res.status(401).json({
                success: false,
                error: 'Manager not authenticated'
            });
        }
        // Fetch all leave requests assigned to this manager
        const leaveRequests = await getLeaveRequestsForManager(managerEmail);
        const wfhRequests = await getWfhRequestsForManager(managerEmail);
        // Combine and format
        const allRequests = [
            ...leaveRequests.map(lr => ({
                id: lr.Id,
                type: 'Leave',
                employeeName: lr.Employee_Name__c,
                employeeEmail: lr.Employee_Email__c,
                startDate: lr.Start_Date__c,
                endDate: lr.End_Date__c,
                leaveType: lr.Leave_Type__c,
                reason: lr.Reason__c,
                status: lr.Status__c,
                createdDate: lr.Created_Date__c
            })),
            ...wfhRequests.map(wr => ({
                id: wr.Id,
                type: 'WFH',
                employeeName: wr.Employee_Name__c,
                employeeEmail: wr.email__c,
                date: wr.Date__c,
                reason: wr.Reason__c,
                status: wr.Status__c,
                createdDate: wr.Created_Date__c
            }))
        ];
        // Filter to show only Pending/Approved (manager is interested in these)
        const filteredRequests = allRequests.filter(r => r.status === 'Pending Approval' || r.status === 'Approved');
        return res.json({
            success: true,
            total: filteredRequests.length,
            requests: filteredRequests,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error fetching manager requests:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch requests'
        });
    }
});
/**
 * POST /api/manager/requests/:requestId/approve
 * Manager approves a request
 */
router.post('/requests/:requestId/approve', async (req, res) => {
    try {
        const { requestId } = req.params;
        const managerEmail = req.session?.user?.email;
        if (!managerEmail) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const result = await salesforceService.updateRecordStatus(requestId, 'Approved');
        if (result.success) {
            // TODO: Send approval email to employee
            console.log(`✅ Request ${requestId} approved by ${managerEmail}`);
            return res.json({
                success: true,
                message: 'Request approved',
                requestId,
                status: 'Approved'
            });
        }
        else {
            throw new Error(result.error || 'Update failed');
        }
    }
    catch (error) {
        console.error('❌ Approval error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * POST /api/manager/requests/:requestId/reject
 * Manager rejects a request
 */
router.post('/requests/:requestId/reject', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body; // Optional rejection reason
        const managerEmail = req.session?.user?.email;
        if (!managerEmail) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const result = await salesforceService.updateRecordStatus(requestId, 'Rejected');
        if (result.success) {
            console.log(`❌ Request ${requestId} rejected by ${managerEmail}`);
            return res.json({
                success: true,
                message: 'Request rejected',
                requestId,
                status: 'Rejected'
            });
        }
        else {
            throw new Error(result.error || 'Update failed');
        }
    }
    catch (error) {
        console.error('❌ Rejection error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
// Helper functions
async function getLeaveRequestsForManager(managerEmail) {
    try {
        // In real Salesforce, query by Manager__c field
        // For now, return mock or all pending leave requests
        const allRecords = salesforceService.getAllRecords();
        return allRecords.filter(r => r.Leave_Type__c && (r.Status__c === 'Pending Approval' || r.Status__c === 'Approved'));
    }
    catch (error) {
        console.error('Error fetching leave requests:', error);
        return [];
    }
}
async function getWfhRequestsForManager(managerEmail) {
    try {
        const allRecords = salesforceService.getAllRecords();
        return allRecords.filter(r => r.Date__c && !r.Leave_Type__c && (r.Status__c === 'Pending Approval' || r.Status__c === 'Approved'));
    }
    catch (error) {
        console.error('Error fetching WFH requests:', error);
        return [];
    }
}
exports.default = router;
//# sourceMappingURL=managerRoutes.js.map