// Integration test for the HR Agent Bot - Testing date parsing and edit functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testDateParsing() {
    console.log('🧪 Testing HR Agent Bot - Date Parsing & Edit Functionality\n');
    console.log('=' .repeat(70));
    
    const testCases = [
        {
            name: "WFH with 19.12.2025 format",
            message: "wfh on 19.12.2025 for doctor appointment",
            expectedDate: "2025-12-19"
        },
        {
            name: "WFH with 19-12 format",
            message: "work from home on 19-12 for personal work",
            expectedDate: "2025-12-19"
        },
        {
            name: "Leave with DD.MM.YYYY",
            message: "annual leave on 25.12.2025 for christmas",
            expectedDate: "2025-12-25"
        },
        {
            name: "WFH with month name",
            message: "wfh on 25 december for holiday preparation",
            expectedDate: "2025-12-25"
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of testCases) {
        try {
            console.log(`\n📝 Test: ${test.name}`);
            console.log(`   Message: "${test.message}"`);
            
            const response = await axios.post(`${BASE_URL}/api/chat`, {
                message: test.message
            });
            
            const reply = response.data.reply;
            console.log(`   Response: ${reply.substring(0, 100)}...`);
            
            // Check if the expected date appears in the response
            if (reply.includes(test.expectedDate)) {
                console.log(`   ✅ PASSED - Date ${test.expectedDate} found in response`);
                passed++;
            } else {
                console.log(`   ❌ FAILED - Expected date ${test.expectedDate} not found`);
                failed++;
            }
            
        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}`);
            failed++;
        }
    }
    
    // Test edit functionality
    console.log('\n\n📝 Testing Edit Functionality');
    console.log('=' .repeat(70));
    
    try {
        // First, create a WFH request
        console.log('\n1️⃣ Creating initial WFH request...');
        const createResponse = await axios.post(`${BASE_URL}/api/chat`, {
            message: "wfh on 20.12.2025 for testing",
        }, {
            headers: { 'x-session-id': 'test-session-123' }
        });
        
        console.log(`   Initial request created`);
        console.log(`   Response: ${createResponse.data.reply.substring(0, 150)}...`);
        
        // Now try to edit
        console.log('\n2️⃣ Attempting to edit the request...');
        const editResponse = await axios.post(`${BASE_URL}/api/chat`, {
            message: "edit",
        }, {
            headers: { 'x-session-id': 'test-session-123' }
        });
        
        console.log(`   Edit prompt received:`);
        console.log(`   ${editResponse.data.reply.substring(0, 200)}...`);
        
        if (editResponse.data.reply.includes('correct') || editResponse.data.reply.includes('Current Details')) {
            console.log(`   ✅ Edit functionality working!`);
            passed++;
        } else {
            console.log(`   ❌ Edit response doesn't show correction prompt`);
            failed++;
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n   ⚠️  Server not running! Please start the server with: npm run dev');
        }
        failed++;
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log(`\n📊 Final Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed! The HR Agent Bot is working perfectly.');
    } else if (failed > 0 && passed > 0) {
        console.log('⚠️  Some tests failed. Please review the implementation.');
    } else {
        console.log('❌ All tests failed. Please check the server and implementation.');
    }
}

// Run the tests
testDateParsing();
