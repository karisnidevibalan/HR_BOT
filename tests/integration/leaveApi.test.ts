import request from 'supertest';
import app from '../../src/app';

import { jsforceMock, mockLeaveBalances, mockHolidays } from '../helpers/mocks';

jest.mock('../../src/services/salesforceService', () => jsforceMock);

describe('POST /api/leave/apply', () => {
  beforeEach(() => resetAllMocks());

  test('LV-01 should apply single-day casual leave (happy path)', async () => {
    jsforceMock.Connection().sobject().create.mockResolvedValueOnce({ id: 'mockId', success: true });
    const res = await request(app)
      .post('/api/leave/apply')
      .send({
        userId: 'emp1',
        type: 'CASUAL',
        startDate: '2025-12-20',
        endDate: '2025-12-20',
        reason: 'Personal',
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Pending');
  });

  test('LV-02 should reject leave for invalid dates', async () => {
    const res = await request(app)
      .post('/api/leave/apply')
      .send({
        userId: 'emp1',
        type: 'CASUAL',
        startDate: 'notadate',
        endDate: 'notadate',
        reason: 'Invalid',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid date/i);
  });

  test('LV-03 should reject leave for insufficient balance', async () => {
    const res = await request(app)
      .post('/api/leave/apply')
      .send({
        userId: 'emp1',
        type: 'SICK',
        startDate: '2025-12-20',
        endDate: '2025-12-30',
        reason: 'Long sick',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  test('LV-04 should reject leave for overlap', async () => {
    // Simulate overlap in mock
    jsforceMock.Connection().sobject().find.mockResolvedValueOnce([{ id: 'existing', startDate: '2025-12-20', endDate: '2025-12-20' }]);
    const res = await request(app)
      .post('/api/leave/apply')
      .send({
        userId: 'emp1',
        type: 'CASUAL',
        startDate: '2025-12-20',
        endDate: '2025-12-20',
        reason: 'Overlap',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/overlap/i);
  });
});
