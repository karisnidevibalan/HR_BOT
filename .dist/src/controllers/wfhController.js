"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wfhController = void 0;
const salesforceService_1 = require("../services/salesforceService");
const salesforceService = new salesforceService_1.SalesforceService();
exports.wfhController = {
    async applyWFH(req, res) {
        try {
            const { employeeName, date, reason } = req.body;
            // Validate required fields with type checking
            if (!employeeName || typeof employeeName !== 'string' ||
                !date || typeof date !== 'string') {
                return res.status(400).json({
                    error: 'Missing or invalid required fields: employeeName (string), date (string)'
                });
            }
            console.log('🏠 WFH application received:', { employeeName, date, reason });
            // Create WFH record in Salesforce (mock)
            const result = await salesforceService.createWfhRecord({
                employeeName,
                date,
                reason: reason || 'No reason provided'
            });
            if (result.success) {
                return res.json({
                    success: true,
                    message: '✅ Work From Home request submitted successfully!',
                    details: {
                        recordId: result.id,
                        employeeName,
                        date,
                        reason: reason || 'No reason provided',
                        status: 'Approved',
                        submittedAt: new Date().toISOString(),
                        nextSteps: 'Your WFH request has been automatically approved. Please ensure you have proper internet connectivity and VPN access.'
                    }
                });
            }
            return res.status(500).json({
                error: 'Failed to create WFH record',
                details: result.error
            });
        }
        catch (error) {
            console.error('WFH Controller Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            return res.status(500).json({
                error: 'Failed to process WFH application',
                details: errorMessage
            });
        }
    },
    async getWFHStatus(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    error: 'Missing WFH record ID'
                });
            }
            const result = await salesforceService.getRecord(id);
            if (result?.success) {
                return res.json({
                    success: true,
                    record: result.record
                });
            }
            return res.status(404).json({
                error: 'WFH record not found'
            });
        }
        catch (error) {
            console.error('Get WFH Status Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            return res.status(500).json({
                error: 'Failed to retrieve WFH status',
                details: errorMessage
            });
        }
    }
};
//# sourceMappingURL=wfhController.js.map