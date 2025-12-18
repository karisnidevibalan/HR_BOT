import request from 'supertest';
import app from '../../src/app';
import { mockSalesforce, resetAllMocks, mockUsers } from '../helpers/mocks';

jest.mock('../../src/services/salesforceService', () => mockSalesforce);

describe('Manager Approval Flow', () => {
  beforeEach(() => resetAllMocks());

  test('APPROVAL-01: should approve leave with valid manager email', async () => {
    mockSalesforce.approveLeave.mockResolvedValue({ success: true, id: 'LV001' });
    const res = await request(app)
      .post('/api/manager/approve')
      .send({
        recordId: 'LV001',
        managerEmail: mockUsers.manager.email,
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('APPROVAL-02: should reject leave with invalid manager email', async () => {
    mockSalesforce.approveLeave.mockResolvedValue({ success: false, error: 'Invalid manager' });
    const res = await request(app)
      .post('/api/manager/approve')
      .send({
        recordId: 'LV001',
        managerEmail: 'notamanager@winfomi.com',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid manager/i);
  });
});
