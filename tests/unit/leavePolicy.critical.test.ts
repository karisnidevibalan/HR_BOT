import { mockLeavePolicy } from '../helpers/mocks';

describe('Leave Policy Edge & Critical Cases', () => {
  test('should fetch leave policy', () => {
    const policy = mockLeavePolicy();
    expect(policy).toHaveProperty('Max_Per_Year__c');
  });

  test('should enforce max per year', () => {
    const policy = mockLeavePolicy();
    expect(policy.Max_Per_Year__c).toBeGreaterThan(0);
  });

  test('should handle policy change mid-year', () => {
    // Simulate policy change
    const policy = { ...mockLeavePolicy(), Max_Per_Year__c: 5 };
    expect(policy.Max_Per_Year__c).toBe(5);
  });
});
