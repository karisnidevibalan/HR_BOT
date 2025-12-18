import request from 'supertest';
import app from '../../src/app';
import { jsforceMock, mockLeaveBalance, mockHolidays } from '../helpers/mocks';

jest.mock('../../src/services/salesforceService', () => jsforceMock);

describe('Leave API Edge & Critical Cases', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should apply single-day casual leave (happy path)', async () => {
    jsforceMock.Connection().sobject().create.mockResolvedValueOnce({ id: 'mockId', success: true });
    const res = await request(app)
      .post('/api/leave/apply')
      .send({ userId: 'emp1', type: 'CASUAL', startDate: '2025-12-20', endDate: '2025-12-20', reason: 'Personal' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Pending');
  });

  test('should reject leave for invalid date format', async () => {
    const res = await request(app)
      .post('/api/leave/apply')
      .send({ userId: 'emp1', type: 'CASUAL', startDate: 'notadate', endDate: 'notadate', reason: 'Invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid date/i);
  });

  test('should reject leave for end date before start date', async () => {
    const res = await request(app)
      .post('/api/leave/apply')
      .send({ userId: 'emp1', type: 'CASUAL', startDate: '2025-12-22', endDate: '2025-12-20', reason: 'Reverse' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/end date/i);
  });

  test('should reject leave for insufficient balance', async () => {
    const res = await request(app)
      .post('/api/leave/apply')
      .send({ userId: 'emp1', type: 'SICK', startDate: '2025-12-20', endDate: '2025-12-30', reason: 'Long sick' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  test('should reject leave for overlap', async () => {
    jsforceMock.Connection().sobject().find.mockResolvedValueOnce([{ id: 'existing', startDate: '2025-12-20', endDate: '2025-12-20' }]);
    const res = await request(app)
      .post('/api/leave/apply')
      .send({ userId: 'emp1', type: 'CASUAL', startDate: '2025-12-20', endDate: '2025-12-20', reason: 'Overlap' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/overlap/i);
  });

  test('should reject leave on holiday', async () => {
    const res = await request(app)
      .post('/api/leave/apply')
      .send({ userId: 'emp1', type: 'CASUAL', startDate: '2025-12-25', endDate: '2025-12-25', reason: 'Holiday' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/holiday/i);
  });

  test('should reject leave on weekend', async () => {
    const res = await request(app)
      .post('/api/leave/apply')
      .send({ userId: 'emp1', type: 'CASUAL', startDate: '2025-12-21', endDate: '2025-12-21', reason: 'Weekend' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/weekend/i);
  });

  test('should enforce leave policy max per month', async () => {
    // Simulate policy violation in mock or service
    const res = await request(app)
      .post('/api/leave/apply')
      .send({ userId: 'emp1', type: 'CASUAL', startDate: '2025-12-01', endDate: '2025-12-31', reason: 'Month max' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/policy/i);
  });

  test('should allow leave cancellation', async () => {
    jsforceMock.Connection().sobject().update.mockResolvedValueOnce({ success: true });
    const res = await request(app)
      .post('/api/leave/cancel')
      .send({ userId: 'emp1', leaveId: 'mockId' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should fetch leave status', async () => {
    jsforceMock.Connection().sobject().findOne.mockResolvedValueOnce({ id: 'mockId', status: 'Pending' });
    const res = await request(app)
      .get('/api/leave/status/mockId');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Pending');
  });
});
