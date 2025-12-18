import request from 'supertest';
import app from '../../src/app';
import { mockSalesforce, resetAllMocks, mockUsers } from '../helpers/mocks';

jest.mock('../../src/services/salesforceService', () => mockSalesforce);

describe('Chatbot Edge & Critical Conversation Cases', () => {
  beforeEach(() => resetAllMocks());

  test('should handle ambiguous leave request', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'I want some time off', employeeEmail: mockUsers.employee.email });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/clarify/i);
  });

  test('should handle invalid request', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'asdfghjkl', employeeEmail: mockUsers.employee.email });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/not understand/i);
  });

  test('should confirm leave request', async () => {
    mockSalesforce.lookupUserByEmail.mockResolvedValue({ success: true, user: mockUsers.employee });
    mockSalesforce.createLeaveRecord.mockResolvedValue({ success: true, id: 'LV001' });
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'I want to apply for casual leave on 2026-01-11 for sister marriage', employeeEmail: mockUsers.employee.email });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/confirm your leave request/i);
  });

  test('should handle multi-turn conversation', async () => {
    // Simulate multi-turn: user asks, bot clarifies, user confirms
    // expect correct flow
  });

  test('should handle error gracefully', async () => {
    // Simulate backend error
    // expect bot to reply with error message
  });
});
