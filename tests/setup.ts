import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config();

// Set test environment variables if not present
if (!process.env.GROQ_API_KEY) {
  process.env.GROQ_API_KEY = 'test-api-key';
}

if (!process.env.SALESFORCE_USERNAME) {
  process.env.SALESFORCE_USERNAME = 'test@example.com';
}

if (!process.env.SALESFORCE_PASSWORD) {
  process.env.SALESFORCE_PASSWORD = 'testpassword';
}

if (!process.env.SALESFORCE_SECURITY_TOKEN) {
  process.env.SALESFORCE_SECURITY_TOKEN = 'testtoken';
}

if (!process.env.DEMO_MODE) {
  process.env.DEMO_MODE = 'true'; // Use demo mode for tests
}