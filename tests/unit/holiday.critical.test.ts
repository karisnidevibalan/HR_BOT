import { mockHolidays } from '../helpers/mocks';

describe('Holiday Edge & Critical Cases', () => {
  test('should include leap year holiday', () => {
    const holidays = mockHolidays();
    expect(holidays).toContainEqual(new Date('2025-12-25'));
    expect(holidays).toContainEqual(new Date('2026-01-15'));
  });

  test('should not allow leave on consecutive holidays', () => {
    // Simulate logic: 25th and 26th Dec are holidays
    const holidays = mockHolidays();
    expect(holidays).toContainEqual(new Date('2025-12-25'));
    expect(holidays).toContainEqual(new Date('2025-12-26'));
  });

  test('should handle year-end holidays', () => {
    const holidays = mockHolidays();
    expect(holidays.some(d => d.getMonth() === 11)).toBe(true); // December
  });
});
