import request from 'supertest';
import app from '../../src/app';
import { mockSalesforce, resetAllMocks, mockUsers } from '../helpers/mocks';

jest.mock('../../src/services/salesforceService', () => mockSalesforce);

describe('Chat Controller Integration', () => {
  beforeEach(() => resetAllMocks());

  test('LV-01 should apply single-day casual leave via chat', async () => {
    mockSalesforce.lookupUserByEmail.mockResolvedValue({ success: true, user: mockUsers.employee });
    mockSalesforce.createLeaveRecord.mockResolvedValue({ success: true, id: 'LV001' });
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'I want to apply for casual leave on 2026-01-11 for sister marriage', employeeEmail: mockUsers.employee.email });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/confirm your leave request/i);
  });

  // Add more tests for all 22 test cases as needed
});
