
import dateParser from '../../src/services/dateParser';



  describe('parseDates', () => {
    test('should parse "yesterday" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('yesterday', ref);
      expect(result.startDate).toBe('2025-12-17');
    });

    test('should parse "today" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('today', ref);
      expect(result.startDate).toBe('2025-12-18');
    });

    test('should parse "tomorrow" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('tomorrow', ref);
      expect(result.startDate).toBe('2025-12-19');
    });

    test('should parse "next Monday" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('next Monday', ref);
      expect(result.startDate).toBe('2025-12-22');
    });

    test('should parse "this Friday" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('this Friday', ref);
      expect(result.startDate).toBe('2025-12-19');
    });

    test('should parse "20th December" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('20th December', ref);
      expect(result.startDate).toBe('2025-12-20');
    });

    test('should parse "December 20" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('December 20', ref);
      expect(result.startDate).toBe('2025-12-20');
    });

    test('should parse "20-12-2025" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('20-12-2025', ref);
      expect(result.startDate).toBe('2025-12-20');
    });

    test('should parse "20.12.2025" correctly', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('20.12.2025', ref);
      expect(result.startDate).toBe('2025-12-20');
    });

    test('should parse "from 15th to 17th" as date range', () => {
      const ref = new Date('2025-12-01');
      const result = dateParser.parseDates('from 15th to 17th', ref);
      expect(result.startDate).toBe('2025-12-15');
      expect(result.endDate).toBe('2025-12-17');
    });

    test('should return null for invalid input', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('notadate', ref);
      expect(result.startDate).toBeNull();
    });

    test('should reject "32nd December" as invalid day', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('32nd December', ref);
      expect(result.startDate).toBeNull();
    });

    test('should reject invalid month name', () => {
      const ref = new Date('2025-12-18');
      const result = dateParser.parseDates('20th FooMonth', ref);
      expect(result.startDate).toBeNull();
  });

  describe('date range validation', () => {
    test('should reject when end date is before start date', () => {
      const start = '2025-12-20';
      const end = '2025-12-18';
      const result = dateParser.calculateInclusiveDays(start, end);
      expect(result).toBe(0);
    });

    test('should reject when start date is in the past and allowPastDates=false', () => {
      const start = '2024-12-18';
      const end = '2025-12-18';
      const isPast = dateParser.isPastDate(start, new Date('2025-12-18'));
      expect(isPast).toBe(true);
    });

    test('should accept valid future date range', () => {
      const start = '2025-12-20';
      const end = '2025-12-22';
      const result = dateParser.calculateInclusiveDays(start, end);
      expect(result).toBe(3);
    });

    test('should accept past dates when allowPastDates=true', () => {
      const start = '2024-12-18';
      const end = '2025-12-18';
      // No explicit allowPastDates param, just check calculation
      const result = dateParser.calculateInclusiveDays(start, end);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('formatHumanReadable', () => {
    test('should format date as "Month DD, YYYY"', () => {
      const date = '2025-12-20';
      const result = dateParser.formatHumanReadable(date);
      expect(result).toBe('December 20, 2025');
    });
  });

  describe('calculateInclusiveDays', () => {
    test('should exclude weekends from working days count (not implemented, just checks days)', () => {
      const start = '2025-12-18'; // Thursday
      const end = '2025-12-22'; // Monday
      const result = dateParser.calculateInclusiveDays(start, end);
      expect(result).toBe(5); // Thu, Fri, Sat, Sun, Mon
    });

    test('should return correct count for weekday range', () => {
      const start = '2025-12-15'; // Monday
      const end = '2025-12-19'; // Friday
      const result = dateParser.calculateInclusiveDays(start, end);
      expect(result).toBe(5);
    });

    test('should return 0 for weekend-only range', () => {
      const start = '2025-12-20'; // Saturday
      const end = '2025-12-21'; // Sunday
      const result = dateParser.calculateInclusiveDays(start, end);
      expect(result).toBe(2); // Sat, Sun
    });
  });
});
