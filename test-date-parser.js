// Test the enhanced date parser with various formats
const dateParser = require('./date-parser');

console.log('🧪 Testing Enhanced Date Parser\n');

const testCases = [
  '15.1.2025',
  '15-1-2025',
  '15/1/2025',
  '15 jan',
  '15th jan',
  '15 january',
  'jan 15',
  'january 15th',
  '15 jan 2025',
  'jan 15 2025',
  '15th january 2025',
  'i want leave on 15 th jan 2025 for marriage',
  'Apply leave on 15.1.2025 for marriage',
  'tomorrow',
  'today',
  '2025-01-15'
];

testCases.forEach(testCase => {
  const result = dateParser.extractDate(testCase);
  const display = dateParser.formatForDisplay(result);
  console.log(`Input: "${testCase}"`);
  console.log(`Parsed: ${result || 'NOT FOUND'}`);
  console.log(`Display: ${display || 'N/A'}`);
  console.log('---');
});
