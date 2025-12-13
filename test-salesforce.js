// Quick Salesforce Connection Test
require('dotenv').config();
const { RealSalesforceService } = require('./real-salesforce-integration');

async function testSalesforceConnection() {
  console.log('🔍 Testing Salesforce Connection...\n');
  
  console.log('📋 Configuration:');
  console.log('- Username:', process.env.SALESFORCE_USERNAME);
  console.log('- Login URL:', process.env.SALESFORCE_LOGIN_URL);
  console.log('- Consumer Key:', process.env.SALESFORCE_CONSUMER_KEY ? 'Set ✓' : 'Missing ✗');
  console.log('- Consumer Secret:', process.env.SALESFORCE_CONSUMER_SECRET ? 'Set ✓' : 'Missing ✗');
  console.log('- Demo Mode:', process.env.DEMO_MODE);
  console.log();

  const salesforce = new RealSalesforceService();
  
  try {
    console.log('🔐 Attempting authentication...');
    const authResult = await salesforce.authenticate();
    
    if (authResult) {
      console.log('\n✅ Authentication successful!');
      console.log('📝 Now testing leave record creation...\n');
      
      const testLeave = {
        employeeName: 'Test Employee',
        leaveType: 'Annual',
        startDate: '2025-12-15',
        endDate: '2025-12-15',
        reason: 'Testing Salesforce integration'
      };
      
      const result = await salesforce.createLeaveRecord(testLeave);
      
      if (result.success) {
        console.log('✅ Leave record created successfully!');
        console.log('Record ID:', result.id);
        console.log('Salesforce ID:', result.salesforceId);
      } else {
        console.log('❌ Failed to create leave record');
        console.log('Error:', result.error);
      }
    } else {
      console.log('\n❌ Authentication failed');
      console.log('Please check your credentials in .env file');
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }
}

testSalesforceConnection();
