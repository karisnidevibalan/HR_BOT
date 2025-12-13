// Service Factory - Automatically switches between Demo and Real Salesforce
const { RealSalesforceService } = require('./real-salesforce-integration');

class SalesforceServiceFactory {
  static createService() {
    const demoMode = process.env.DEMO_MODE === 'true';
    
    if (demoMode) {
      console.log('🔧 Using Mock Salesforce Service (Demo Mode)');
      return new MockSalesforceService();
    } else {
      console.log('🔗 Using Real Salesforce Service (Live Mode)');
      return new RealSalesforceService();
    }
  }
}

// Mock Service (Current Demo)
class MockSalesforceService {
  constructor() {
    this.mockDatabase = [];
    this.nextId = 1;
  }

  async createLeaveRecord(leaveData) {
    // ... current mock implementation
    const record = {
      id: `LEAVE_${this.nextId++}`,
      employeeName: leaveData.employeeName,
      leaveType: leaveData.leaveType,
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      reason: leaveData.reason,
      status: 'Pending Approval',
      createdAt: new Date().toISOString()
    };

    this.mockDatabase.push(record);
    console.log('✅ Mock Leave Record Created:', record.id);
    
    return { success: true, id: record.id, record };
  }

  // ... other mock methods
}

module.exports = { SalesforceServiceFactory };