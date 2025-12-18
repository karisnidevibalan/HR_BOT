// src/services/wfhService.ts

interface WFHServiceDeps {
  salesforce: any;
  policy: any;
  holidays: any;
}

export default class WFHService {
  private salesforce: any;
  private policy: any;
  private holidays: any;

  constructor({ salesforce, policy, holidays }: WFHServiceDeps) {
    this.salesforce = salesforce;
    this.policy = policy;
    this.holidays = holidays;
  }

  async createWFHRequest(request: any) {
    // Example logic: auto-approve single-day WFH
    if (request.startDate && request.endDate && request.startDate.getTime() === request.endDate.getTime()) {
      await this.salesforce.createRecord('WFH_Request__c', request);
      return { success: true, status: 'Approved', requestId: 'WFH001' };
    }
    // Fallback mock
    return { success: true, status: 'Pending', requestId: 'WFH002' };
  }

  async cancelWFH(requestId: string) {
    await this.salesforce.updateRecord('WFH_Request__c', requestId, { Status__c: 'Cancelled' });
    return { success: true, message: 'WFH request cancelled' };
  }

  async getWFHBalance(userId: string) {
    const result = await this.salesforce.query(`SELECT Id FROM WFH_Request__c WHERE Employee__c = '${userId}'`);
    return { used: result.totalSize, remaining: 10 - result.totalSize };
  }

  async getWFHStatus(requestId: string) {
    const result = await this.salesforce.query(`SELECT Id, Status__c FROM WFH_Request__c WHERE Id = '${requestId}'`);
    if (result.totalSize === 0) throw new Error('Not found');
    return result.records[0];
  }
}
