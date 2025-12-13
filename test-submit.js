// test-submit.js
require('dotenv').config();
const { RealSalesforceService } = require("./real-salesforce-integration");

(async () => {
    try {
        const salesforce = new RealSalesforceService();
        
        console.log('📝 Updating leave request status to Approved...');
        const result = await salesforce.updateRecord("a2AcZ000001y7PRUAY", {
            Status__c: 'Approved'
        });
        
        console.log("✅ Approval Submitted:", result);
    } catch (err) {
        console.error("❌ Error:", err);
    }
})();
