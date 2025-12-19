"use strict";
// src/services/wfhService.ts
Object.defineProperty(exports, "__esModule", { value: true });
class WFHService {
    constructor({ salesforce, policy, holidays }) {
        this.salesforce = salesforce;
        this.policy = policy;
        this.holidays = holidays;
    }
    async createWFHRequest(request) {
        // Example logic: auto-approve single-day WFH
        if (request.startDate && request.endDate && request.startDate.getTime() === request.endDate.getTime()) {
            await this.salesforce.createRecord('WFH_Request__c', request);
            return { success: true, status: 'Approved', requestId: 'WFH001' };
        }
        // Fallback mock
        return { success: true, status: 'Pending', requestId: 'WFH002' };
    }
    async cancelWFH(requestId) {
        await this.salesforce.updateRecord('WFH_Request__c', requestId, { Status__c: 'Cancelled' });
        return { success: true, message: 'WFH request cancelled' };
    }
    async getWFHBalance(userId) {
        const result = await this.salesforce.query(`SELECT Id FROM WFH_Request__c WHERE Employee__c = '${userId}'`);
        return { used: result.totalSize, remaining: 10 - result.totalSize };
    }
    async getWFHStatus(requestId) {
        const result = await this.salesforce.query(`SELECT Id, Status__c FROM WFH_Request__c WHERE Id = '${requestId}'`);
        if (result.totalSize === 0)
            throw new Error('Not found');
        return result.records[0];
    }
}
exports.default = WFHService;
//# sourceMappingURL=wfhService.js.map