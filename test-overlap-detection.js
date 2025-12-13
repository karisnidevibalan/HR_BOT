/**
 * Test script for overlap detection
 * Tests the critical scenario: "want leave on 20th and I already have leave that week"
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Color codes for console output
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

async function sendMessage(message, sessionId = 'test-session') {
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message: message
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`${RED}Error ${error.response.status}:${RESET}`, error.response.data);
    } else if (error.request) {
      console.error(`${RED}No response received. Is the server running on ${BASE_URL}?${RESET}`);
    } else {
      console.error(`${RED}Error:${RESET}`, error.message);
    }
    throw error;
  }
}

async function testOverlapDetection() {
  console.log(`${CYAN}========================================${RESET}`);
  console.log(`${CYAN}Testing Overlap Detection Scenario${RESET}`);
  console.log(`${CYAN}========================================${RESET}\n`);

  const sessionId = `test-${Date.now()}`;

  try {
    // Step 1: User mentions wanting leave on 20th with existing leave that week
    console.log(`${YELLOW}Step 1: User says "want leave on 20th and I already have leave that week"${RESET}`);
    const response1 = await sendMessage('want leave on 20th and I already have leave that week', sessionId);
    console.log(`${CYAN}Bot Response:${RESET}\n${response1.reply}\n`);
    
    // Check if bot asks for clarification
    if (response1.reply.includes('Complete Date') || response1.reply.includes('month and year')) {
      console.log(`${GREEN}✓ Bot correctly asks for clarification${RESET}\n`);
    } else {
      console.log(`${RED}✗ Bot did not ask for clarification as expected${RESET}\n`);
    }

    // Check if bot mentions checking for overlap
    if (response1.reply.includes('check') && response1.reply.includes('overlap')) {
      console.log(`${GREEN}✓ Bot mentions it will check for overlap${RESET}\n`);
    } else {
      console.log(`${YELLOW}⚠ Bot did not explicitly mention overlap checking${RESET}\n`);
    }

    // Step 2: User provides month/year
    console.log(`${YELLOW}Step 2: User clarifies "December"${RESET}`);
    const response2 = await sendMessage('December', sessionId);
    console.log(`${CYAN}Bot Response:${RESET}\n${response2.reply}\n`);
    
    // Check if bot confirms the date and asks for type/reason
    if (response2.reply.includes('20') && response2.reply.includes('December')) {
      console.log(`${GREEN}✓ Bot correctly confirms the date${RESET}\n`);
    }
    if (response2.reply.includes('Leave Type') || response2.reply.includes('Annual')) {
      console.log(`${GREEN}✓ Bot asks for leave type${RESET}\n`);
    }

    // Step 3: User provides leave type and reason
    console.log(`${YELLOW}Step 3: User provides "Annual leave for vacation"${RESET}`);
    const response3 = await sendMessage('Annual leave for vacation', sessionId);
    console.log(`${CYAN}Bot Response:${RESET}\n${response3.reply}\n`);
    
    // Check if bot detects overlap
    if (response3.reply.includes('Cannot create leave request') || 
        response3.reply.includes('already have') || 
        response3.reply.includes('overlap')) {
      console.log(`${GREEN}✓✓✓ SUCCESS! Bot correctly detected overlapping leave${RESET}`);
      
      // Check if bot shows existing leave details
      if (response3.reply.includes('18') && response3.reply.includes('22')) {
        console.log(`${GREEN}✓ Bot shows correct existing leave dates (18-22 Dec)${RESET}`);
      }
      if (response3.reply.includes('Christmas')) {
        console.log(`${GREEN}✓ Bot shows existing leave reason${RESET}`);
      }
      if (response3.reply.includes('modify') || response3.reply.includes('cancel')) {
        console.log(`${GREEN}✓ Bot offers options to modify or cancel${RESET}`);
      }
      
      console.log(`\n${GREEN}========================================${RESET}`);
      console.log(`${GREEN}TEST PASSED: Overlap detection working!${RESET}`);
      console.log(`${GREEN}========================================${RESET}`);
    } else if (response3.reply.includes('Leave request created')) {
      console.log(`${RED}✗✗✗ FAILURE! Bot created a new leave despite overlap${RESET}`);
      console.log(`${RED}========================================${RESET}`);
      console.log(`${RED}TEST FAILED: Bot should NOT create leave${RESET}`);
      console.log(`${RED}========================================${RESET}`);
    } else {
      console.log(`${YELLOW}⚠ Bot response unclear - manual inspection needed${RESET}`);
    }

  } catch (error) {
    console.error(`${RED}Test failed with error:${RESET}`, error.message);
  }
}

// Test alternate scenario where user provides full info at once
async function testFullInfoOverlap() {
  console.log(`\n${CYAN}========================================${RESET}`);
  console.log(`${CYAN}Testing Full Info Overlap Scenario${RESET}`);
  console.log(`${CYAN}========================================${RESET}\n`);

  const sessionId = `test-full-${Date.now()}`;

  try {
    console.log(`${YELLOW}User says: "I want annual leave on 20th December 2025 for vacation"${RESET}`);
    const response = await sendMessage('I want annual leave on 20th December 2025 for vacation', sessionId);
    console.log(`${CYAN}Bot Response:${RESET}\n${response.reply}\n`);
    
    if (response.reply.includes('Cannot create leave request') || 
        response.reply.includes('already have') || 
        response.reply.includes('overlap')) {
      console.log(`${GREEN}✓ Bot correctly detected overlapping leave${RESET}`);
      console.log(`${GREEN}TEST PASSED${RESET}`);
    } else if (response.reply.includes('Leave request created')) {
      console.log(`${RED}✗ Bot created leave despite overlap${RESET}`);
      console.log(`${RED}TEST FAILED${RESET}`);
    } else {
      console.log(`${YELLOW}⚠ Response unclear - needs manual check${RESET}`);
    }
  } catch (error) {
    console.error(`${RED}Test failed with error:${RESET}`, error.message);
  }
}

// Run tests
async function runTests() {
  console.log(`${CYAN}Starting overlap detection tests...${RESET}\n`);
  console.log(`${YELLOW}Note: Make sure DEMO_MODE=true in .env and server is running on port 5000${RESET}\n`);
  
  await testOverlapDetection();
  await testFullInfoOverlap();
  
  console.log(`\n${CYAN}All tests completed!${RESET}`);
}

runTests();
