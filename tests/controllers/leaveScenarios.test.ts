import { Request, Response } from 'express';
import contextManager from '../../src/utils/contextManager';
import { SalesforceService } from '../../src/services/salesforceService';

// Set environment variables BEFORE importing chatController
process.env.DEMO_MODE = 'true';
process.env.ALLOW_BACKDATED_LEAVE = 'false';

// NOW import chatController after env vars are set
import { chatController } from '../../src/controllers/chatController';

describe('Leave request scenarios', () => {
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let mockResponse: Partial<Response>;
  let overlapSpy: jest.SpyInstance;
  let balanceSpy: jest.SpyInstance;

  const baseBalance = {
    total: 12,
    used: 2,
    remaining: 10,
    leaveType: 'CASUAL',
    isAvailable: true
  };

  function buildRequest(sessionId: string, message: string): Request {
    return {
      body: { message },
      headers: { 'x-session-id': sessionId }
    } as unknown as Request;
  }

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-12-10T00:00:00.000Z'));
    overlapSpy = jest.spyOn(SalesforceService.prototype, 'checkLeaveOverlap');
    balanceSpy = jest.spyOn(SalesforceService.prototype, 'checkLeaveBalance');
  });

  afterAll(() => {
    overlapSpy.mockRestore();
    balanceSpy.mockRestore();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
    overlapSpy.mockResolvedValue({ hasOverlap: false, overlappingLeaves: [] });
    balanceSpy.mockResolvedValue(baseBalance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function primeSession(sessionId: string) {
    contextManager.clearContext(sessionId);
    contextManager.setEmployeeProfile(sessionId, {
      id: `005TEST-${sessionId}`,
      name: 'Employee Tester',
      email: 'employee@winfomi.com'
    });
  }

  it('LV-01: confirms casual leave for tomorrow without clarification', async () => {
    const session = 'lv-01';
    primeSession(session);

    const request = buildRequest(session, 'I want to apply for casual leave tomorrow.');
    await chatController(request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.intent).toBe('confirm_leave');
    expect(payload.reply).toContain('Please confirm your leave request');
    expect(payload.pendingRequest.details.leaveType).toBe('CASUAL');
    expect(payload.pendingRequest.details.startDate).toBe('2025-12-11');
  });

  it('LV-02: confirms multi-day sick leave', async () => {
    const session = 'lv-02';
    primeSession(session);

    const request = buildRequest(session, 'Apply sick leave from 15th to 17th of this month.');
    await chatController(request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.intent).toBe('confirm_leave');
    expect(payload.pendingRequest.details.startDate).toBe('2025-12-15');
    expect(payload.pendingRequest.details.endDate).toBe('2025-12-17');
    expect(payload.pendingRequest.details.leaveType).toBe('SICK');
    expect(payload.reply).toContain('**Duration**: 3 days');
  });

  it('LV-03: rejects invalid date range', async () => {
    const session = 'lv-03';
    primeSession(session);

    const request = buildRequest(session, 'Apply leave from 20th to 10th this month.');
    await chatController(request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.reply).toContain('End date cannot be earlier than start date');
    expect(payload.intent).toBe('apply_leave');
  });

  it('LV-04: blocks insufficient balance before confirmation', async () => {
    balanceSpy.mockResolvedValueOnce({
      ...baseBalance,
      remaining: 5,
      isAvailable: false
    });

    const session = 'lv-04';
    primeSession(session);

    const request = buildRequest(session, 'I want 20 days of casual leave starting next Monday.');
    await chatController(request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.intent).toBe('leave_balance_insufficient');
    expect(payload.reply).toContain('Insufficient leave balance');
  });

  it('LV-05: detects overlapping leave and blocks new request', async () => {
    overlapSpy.mockResolvedValueOnce({
      hasOverlap: true,
      overlappingLeaves: [
        {
          id: 'LEAVE_123',
          leaveType: 'CASUAL',
          startDate: '2025-12-18',
          endDate: '2025-12-20',
          reason: 'Trip',
          status: 'Approved'
        }
      ]
    });

    const session = 'lv-05';
    primeSession(session);

    const request = buildRequest(session, 'I want leave on 20th and I already have leave that week.');
    await chatController(request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.reply).toContain('You already have');
    expect(payload.intent).toBe('apply_leave');
  });

  it('LV-06: rejects past date requests', async () => {
    const session = 'lv-06';
    primeSession(session);

    const request = buildRequest(session, 'Give me sick leave for yesterday.');
    await chatController(request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.reply).toContain('Cannot apply leave for past dates');
  });

  it('LV-07: confirms half-day leave with correct duration', async () => {
    const session = 'lv-07';
    primeSession(session);

    const request = buildRequest(session, 'I need half-day leave tomorrow afternoon.');
    await chatController(request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.reply).toContain('**Duration**: Half day');
    expect(payload.pendingRequest.details.durationDays).toBe(0.5);
  });

  it('EDGE-02: flags invalid calendar dates', async () => {
    const session = 'edge-02';
    primeSession(session);

    const request = buildRequest(session, 'Apply leave on 32th of December.');
    await chatController(request, mockResponse as Response);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.reply).toContain('Invalid day');
  });
});
