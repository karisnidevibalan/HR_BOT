import request from 'supertest';
import app from '../../src/app';
import { jsforceMock, mockWfhPolicy, mockHolidays } from '../helpers/mocks';

jest.mock('../../src/services/salesforceService', () => jsforceMock);

describe('POST /api/wfh/apply', () => {
  beforeEach(() => resetAllMocks());

  test('WFH-01 should apply WFH (happy path)', async () => {
    jsforceMock.Connection().sobject().create.mockResolvedValueOnce({ id: 'mockId', success: true });
    const res = await request(app)
      .post('/api/wfh/apply')
      .send({
        userId: 'emp1',
        date: '2025-12-19',
        reason: 'Focus work',
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
  });

  test('WFH-02 should block WFH on holiday', async () => {
    const res = await request(app)
      .post('/api/wfh/apply')
      .send({
        userId: 'emp1',
        date: '2025-12-25',
        reason: 'Holiday',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/holiday/i);
  });

  test('WFH-03 should reject WFH if limit exceeded', async () => {
    // Simulate limit exceeded in mock or service
    const res = await request(app)
      .post('/api/wfh/apply')
      .send({
        userId: 'emp1',
        date: '2025-12-20',
        reason: 'Limit',
        wfhCountThisWeek: 4,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/limit/i);
  });
});
