// Quick test to verify intent detection for WFH vs Leave
const testCases = [
    {
        message: "work from home on 25 th december for christmas",
        expectedIntent: "apply_wfh",
        description: "WFH request with date and reason"
    },
    {
        message: "WFH tomorrow for doctor's appointment",
        expectedIntent: "apply_wfh",
        description: "WFH with tomorrow and reason"
    },
    {
        message: "not leave request its work from home",
        expectedIntent: "apply_wfh",
        description: "Explicit WFH clarification"
    },
    {
        message: "I want leave on December 25, 2025",
        expectedIntent: "apply_leave",
        description: "Leave request with date"
    },
    {
        message: "annual leave on december 25 for christmas",
        expectedIntent: "apply_leave",
        description: "Annual leave with date and reason"
    },
    {
        message: "working from home next monday",
        expectedIntent: "apply_wfh",
        description: "WFH with relative date"
    }
];

// Set dummy API key to prevent error
process.env.GROQ_API_KEY = 'dummy-key-for-testing';

// Import the AiService
const path = require('path');
const distPath = path.join(__dirname, 'dist', 'services', 'aiService.js');
const { AiService } = require(distPath);

const aiService = new AiService();

console.log('🧪 Testing Intent Detection\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    const detectedIntent = aiService.detectIntent(test.message);
    const isCorrect = detectedIntent === test.expectedIntent;
    
    if (isCorrect) {
        passed++;
        console.log(`✅ Test ${index + 1}: PASSED`);
    } else {
        failed++;
        console.log(`❌ Test ${index + 1}: FAILED`);
    }
    
    console.log(`   Message: "${test.message}"`);
    console.log(`   Expected: ${test.expectedIntent}`);
    console.log(`   Detected: ${detectedIntent}`);
    console.log(`   Description: ${test.description}`);
    console.log('');
});

console.log('=' .repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
    console.log('🎉 All tests passed!');
} else {
    console.log('⚠️  Some tests failed. Please review the intent detection logic.');
}
