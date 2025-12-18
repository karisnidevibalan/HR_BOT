/**
 * Mocks and stubs for Salesforce, leave, WFH, and email services.
 * All functions use TypeScript interfaces and provide sensible defaults.
 */
import { jest } from '@jest/globals';

// --- Interfaces ---
export interface SalesforceServiceStub {
  query: (soql: string) => Promise<{ totalSize: number; records: any[] }>;
  createRecord: (objectName: string, data: any) => Promise<{ id: string; success: boolean }>;
  updateRecord: (objectName: string, id: string, data: any) => Promise<{ success: boolean }>;
  queryCustomSetting: (settingName: string) => Promise<WFHPolicyConfig>;
}

export interface WFHPolicyConfig {
  Max_Per_Day__c: number;
  Max_Per_Week__c: number;
  Max_Per_Month__c: number;
  Auto_Approve_Single_Day__c: boolean;
  Block_On_Holidays__c: boolean;
  Block_On_Weekends__c: boolean;
}

export interface User {
  Id: string;
  Name: string;
  Email: string;
  ManagerId?: string;
}

export interface LeaveRecord {
  Id: string;
  Employee__c: string;
  Start_Date__c: string;
  End_Date__c: string;
  Status__c: string;
  Type__c: string;
  Reason__c: string;
}

export interface WFHRecord {
  Id: string;
  Employee__c: string;
  Start_Date__c: string;
  End_Date__c: string;
  Status__c: string;
}

// --- Mocks ---

/**
 * Returns a stubbed Salesforce service with query, create, update, and custom setting methods.
 */
export function mockSalesforceService(): SalesforceServiceStub {
  return {
    query: jest.fn<ReturnType<SalesforceServiceStub['query']>, Parameters<SalesforceServiceStub['query']>>()
      .mockResolvedValue({ totalSize: 0, records: [] }),
    createRecord: jest.fn().mockResolvedValue({ id: 'mockId', success: true }),
    updateRecord: jest.fn().mockResolvedValue({ success: true }),
    queryCustomSetting: jest.fn().mockResolvedValue(mockWFHPolicy()),
  };
}

// jsforceMock for integration tests (simulate jsforce.Connection)
export const jsforceMock: any = {
  Connection: jest.fn(() => ({
    sobject: jest.fn(() => ({
      create: jest.fn().mockResolvedValue({ id: 'mockId', success: true }),
      update: jest.fn().mockResolvedValue({ success: true }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    })),
  })),
};

// Helper to reset all jest mocks
export function resetAllMocks() {
  jest.clearAllMocks();
}

/**
 * Returns a mock leave balance object.
 */
export function mockLeaveBalance() {
  return { CASUAL: 10, SICK: 5, ANNUAL: 20 };
}

/**
 * Returns an array of holiday dates.
 */
export function mockHolidays(): Date[] {
  return [
    new Date('2025-12-25'),
    new Date('2025-12-26'),
    new Date('2026-01-15'),
  ];
}

/**
 * Returns a mock WFH policy config.
 */
export function mockWFHPolicy(): WFHPolicyConfig {
  return {
    Max_Per_Day__c: 1,
    Max_Per_Week__c: 3,
    Max_Per_Month__c: 12,
    Auto_Approve_Single_Day__c: true,
    Block_On_Holidays__c: true,
    Block_On_Weekends__c: true,
  };
}

/**
 * Returns a mock user object. If isManager is false, includes ManagerId.
 * @param userId - User ID
 * @param isManager - Whether the user is a manager
 */
export function mockUser(userId: string = '005EMP', isManager: boolean = false): User {
  return {
    Id: userId,
    Name: isManager ? 'Manager User' : 'Test Employee',
    Email: isManager ? 'manager@company.com' : 'employee@company.com',
    ...(isManager ? {} : { ManagerId: '005MAN' }),
  };
}

/**
 * Returns a sample Leave_Request__c record, with optional overrides.
 */
export function mockLeaveRecord(overrides: Partial<LeaveRecord> = {}): LeaveRecord {
  return {
    Id: 'LR001',
    Employee__c: '005EMP',
    Start_Date__c: '2025-12-20',
    End_Date__c: '2025-12-20',
    Status__c: 'Pending',
    Type__c: 'CASUAL',
    Reason__c: 'Personal',
    ...overrides,
  };
}

/**
 * Returns a sample WFH_Request__c record, with optional overrides.
 */
export function mockWFHRecord(overrides: Partial<WFHRecord> = {}): WFHRecord {
  return {
    Id: 'WFH001',
    Employee__c: '005EMP',
    Start_Date__c: '2025-12-21',
    End_Date__c: '2025-12-21',
    Status__c: 'Approved',
    ...overrides,
  };
}

/**
 * Returns a mock email service with a send method.
 */
export function mockEmailService(): any {
  return {
    send: jest.fn().mockResolvedValue(true ),
  };
}
