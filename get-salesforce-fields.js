// Get Salesforce Object Field Information
require('dotenv').config();
const { RealSalesforceService } = require('./real-salesforce-integration');

async function getObjectInfo() {
  console.log('🔍 Fetching Salesforce Object Information...\n');
  
  const salesforce = new RealSalesforceService();
  
  try {
    await salesforce.authenticate();
    
    console.log('📋 Leave Request Object Fields:\n');
    const leaveDesc = await salesforce.conn.sobject('Leave_Request__c').describe();
    
    console.log('Available fields:');
    leaveDesc.fields.forEach(field => {
      if (field.createable && field.name.includes('__c')) {
        console.log(`- ${field.name} (${field.type})${field.type === 'picklist' ? ' - Picklist' : ''}`);
        if (field.type === 'picklist' && field.picklistValues.length > 0) {
          console.log('  Valid values:', field.picklistValues.map(v => v.value).join(', '));
        }
      }
    });

    console.log('\n📋 WFH Request Object Fields:\n');
    try {
      const wfhDesc = await salesforce.conn.sobject('WFH_Request__c').describe();
      console.log('Available fields:');
      wfhDesc.fields.forEach(field => {
        if (field.createable && field.name.includes('__c')) {
          console.log(`- ${field.name} (${field.type})${field.type === 'picklist' ? ' - Picklist' : ''}`);
          if (field.type === 'picklist' && field.picklistValues.length > 0) {
            console.log('  Valid values:', field.picklistValues.map(v => v.value).join(', '));
          }
        }
      });
    } catch (e) {
      console.log('WFH_Request__c object not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getObjectInfo();
