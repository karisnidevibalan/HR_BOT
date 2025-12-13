// Real Salesforce Integration Example
const jsforce = require('jsforce');

class RealSalesforceService {
  constructor() {
    this.conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://test.salesforce.com'
    });
  }

  async authenticate() {
    try {
      // Login to Salesforce using username, password + security token
      const userInfo = await this.conn.login(
        process.env.SALESFORCE_USERNAME,
        process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
      );
      
      console.log('✅ Salesforce authentication successful');
      console.log('User ID:', userInfo.id);
      console.log('Org ID:', userInfo.organizationId);
      
      return true;
    } catch (error) {
      console.error('❌ Salesforce authentication failed:', error.message);
      return false;
    }
  }

  async createLeaveRecord(leaveData) {
    try {
      // Authenticate first
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Salesforce authentication failed');
      }

      // Map leave types to Salesforce picklist values
      const leaveTypeMap = {
        'Annual': 'Casual Leave',
        'Sick': 'Sick Leave',
        'Casual': 'Casual Leave',
        'annual': 'Casual Leave',
        'sick': 'Sick Leave',
        'casual': 'Casual Leave'
      };
      
      const sfLeaveType = leaveTypeMap[leaveData.leaveType] || 'Casual Leave';
      
      // Create Leave record in Salesforce with correct picklist values
      const recordData = {
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
        console.log('✅ Email added to Salesforce record:', leaveData.employeeEmail);
      } else {
        console.log('⚠️ No employeeEmail in leaveData:', JSON.stringify(leaveData, null, 2));
      }
      
      console.log('📦 Salesforce record data being sent:', JSON.stringify(recordData, null, 2));
      
      const result = await this.conn.sobject('Leave_Request__c').create(recordData);

      console.log('✅ Real Salesforce Leave Record Created:', result.id);
      
      return {
        success: true,
        id: result.id,
        salesforceId: result.id,
        record: result
      };
      
    } catch (error) {
      console.error('❌ Salesforce Leave Record Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createWFHRecord(wfhData) {
    try {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Salesforce authentication failed');
      }

      // WFH requests are stored as Leave_Request__c with type 'Work From Home'
      const recordData = {
        Employee_Name__c: wfhData.employeeName,
        Leave_Type__c: 'Work From Home',
        Start_Date__c: wfhData.date,
        End_Date__c: wfhData.date,
        Reason__c: wfhData.reason,
        Status__c: 'Pending',
        Request_Source__c: 'Chatbot'
      };
      
      // Add email if provided
      if (wfhData.employeeEmail) {
        recordData.Employee_Email__c = wfhData.employeeEmail;
      }
      
      const result = await this.conn.sobject('Leave_Request__c').create(recordData);

      console.log('✅ Real Salesforce WFH Record Created:', result.id);
      
      return {
        success: true,
        id: result.id,
        salesforceId: result.id,
        record: result
      };
      
    } catch (error) {
      console.error('❌ Salesforce WFH Record Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateRecord(objectType, recordId, updateData) {
    try {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Salesforce authentication failed');
      }

      // Update existing record
      const result = await this.conn.sobject(objectType).update({
        Id: recordId,
        ...updateData
      });

      console.log('✅ Salesforce Record Updated:', recordId);
      return { success: true, result };
      
    } catch (error) {
      console.error('❌ Salesforce Update Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getRecord(recordId) {
    try {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Salesforce authentication failed');
      }

      // Query record from Salesforce
      const record = await this.conn.sobject('Leave_Request__c').retrieve(recordId);
      
      return { success: true, record };
      
    } catch (error) {
      console.error('❌ Salesforce Retrieve Error:', error);
      return { success: false, error: error.message };
    }
  }

  async queryRecords(statusOrEmployeeName) {
    try {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Salesforce authentication failed');
      }

      let query = '';
      
      // If parameter is a status (Pending, Approved, Rejected), query by status
      if (['Pending', 'Approved', 'Rejected'].includes(statusOrEmployeeName)) {
        query = `
          SELECT Id, Employee_Name__c, Leave_Type__c, Start_Date__c, 
                 End_Date__c, Reason__c, Status__c, Request_Source__c, CreatedDate
          FROM Leave_Request__c 
          WHERE Status__c = '${statusOrEmployeeName}' 
          ORDER BY CreatedDate DESC
        `;
      } else {
        // Otherwise query by employee name
        query = `
          SELECT Id, Employee_Name__c, Leave_Type__c, Start_Date__c, 
                 End_Date__c, Reason__c, Status__c, Request_Source__c, CreatedDate
          FROM Leave_Request__c 
          WHERE Employee_Name__c = '${statusOrEmployeeName}' 
          ORDER BY CreatedDate DESC
        `;
      }

      const result = await this.conn.query(query);

      console.log('📊 Found', result.totalSize, 'leave records');
      
      return { success: true, records: result.records };
      
    } catch (error) {
      console.error('❌ Salesforce Query Error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { RealSalesforceService };