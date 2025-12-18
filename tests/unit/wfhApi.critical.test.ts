import request from 'supertest';
import app from '../../src/app';
import { jsforceMock, mockWFHPolicy, mockHolidays } from '../helpers/mocks';

jest.mock('../../src/services/salesforceService', () => jsforceMock);

describe('WFH API Edge & Critical Cases', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should apply WFH (happy path)', async () => {
    jsforceMock.Connection().sobject().create.mockResolvedValueOnce({ id: 'mockId', success: true });
    const res = await request(app)
      .post('/api/wfh/apply')
      .send({ userId: 'emp1', date: '2025-12-19', reason: 'Focus work' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
  });

  test('should block WFH on holiday', async () => {
    const res = await request(app)
      .post('/api/wfh/apply')
      .send({ userId: 'emp1', date: '2025-12-25', reason: 'Holiday' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/holiday/i);
  });

  test('should block WFH on weekend', async () => {
    const res = await request(app)
      .post('/api/wfh/apply')
      .send({ userId: 'emp1', date: '2025-12-21', reason: 'Weekend' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/weekend/i);
  });

  test('should reject WFH if limit exceeded', async () => {
    const res = await request(app)
      .post('/api/wfh/apply')
      .send({ userId: 'emp1', date: '2025-12-20', reason: 'Limit', wfhCountThisWeek: 4 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/limit/i);
  });

  test('should reject WFH overlap with leave', async () => {
    // Simulate overlap in mock or service
    jsforceMock.Connection().sobject().find.mockResolvedValueOnce([{ id: 'existing', date: '2025-12-20' }]);
    const res = await request(app)
      .post('/api/wfh/apply')
      .send({ userId: 'emp1', date: '2025-12-20', reason: 'Overlap' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/overlap/i);
  });

  test('should allow WFH cancellation', async () => {
    jsforceMock.Connection().sobject().update.mockResolvedValueOnce({ success: true });
    const res = await request(app)
      .post('/api/wfh/cancel')
      .send({ userId: 'emp1', wfhId: 'mockId' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should fetch WFH status', async () => {
    jsforceMock.Connection().sobject().findOne.mockResolvedValueOnce({ id: 'mockId', status: 'Approved' });
    const res = await request(app)
      .get('/api/wfh/status/mockId');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
  });
});
