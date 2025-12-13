/**
 * Enhanced Date Parser Utility
 * Handles multiple date formats with high accuracy
 */

export interface DateRange {
  startDate: string;
  endDate: string;
}

export class DateParser {
  private monthNames: { [key: string]: number } = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'sept': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };

  /**
   * Parse date from text supporting multiple formats
   */
  parseDate(text: string): string | null {
    if (!text) return null;

    const normalized = text.toLowerCase().trim();

    // 1. Try relative dates first (today, tomorrow, yesterday)
    const relativeDate = this.parseRelativeDate(normalized);
    if (relativeDate) return relativeDate;

    // 2. Try ISO format (YYYY-MM-DD) - highest priority for explicit dates
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return isoMatch[0];
    }

    // 3. Try numeric formats with year (DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY)
    const numericWithYearMatch = text.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
    if (numericWithYearMatch) {
      const day = parseInt(numericWithYearMatch[1]);
      const month = parseInt(numericWithYearMatch[2]);
      const year = parseInt(numericWithYearMatch[3]);
      
      // Validate date
      if (this.isValidDate(day, month, year)) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // 4. Try numeric formats without year (DD-MM, DD.MM)
    const numericNoYearMatch = text.match(/(\d{1,2})[.\-/](\d{1,2})(?![.\-/\d])/);
    if (numericNoYearMatch) {
      const day = parseInt(numericNoYearMatch[1]);
      const month = parseInt(numericNoYearMatch[2]);
      const year = new Date().getFullYear();
      
      if (this.isValidDate(day, month, year)) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // 5. Try month name formats (15 December, December 15, 15th Dec, etc.)
    const monthNameDate = this.parseMonthNameDate(text);
    if (monthNameDate) return monthNameDate;

    return null;
  }

  /**
   * Parse date range (from X to Y)
   */
  parseDateRange(text: string): DateRange | null {
    const normalized = text.toLowerCase();

    // Pattern: "from X to Y next month"
    const crossMonthMatch = text.match(/(?:from\s+)?(\d{1,2})(?:th|st|nd|rd)?\s+(?:to|till|-)\s+(\d{1,2})(?:th|st|nd|rd)?\s+next\s+month/i);
    if (crossMonthMatch) {
      const startDay = parseInt(crossMonthMatch[1]);
      const endDay = parseInt(crossMonthMatch[2]);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const nextMonth = currentMonth + 1;
      const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
      const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
      
      return {
        startDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
        endDate: `${nextYear}-${String(adjustedNextMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      };
    }

    // Pattern: "from X to Y" (same month)
    const sameMonthMatch = text.match(/(?:from\s+)?(\d{1,2})(?:th|st|nd|rd)?\s+(?:to|till|-)\s+(\d{1,2})(?:th|st|nd|rd)?(?:\s+(?:of\s+)?(?:this\s+)?month)?/i);
    if (sameMonthMatch) {
      const startDay = parseInt(sameMonthMatch[1]);
      const endDay = parseInt(sameMonthMatch[2]);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      return {
        startDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
        endDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      };
    }

    // Pattern: "from 15 Dec to 20 Dec"
    const monthRangeMatch = text.match(/(?:from\s+)?(\d{1,2})(?:th|st|nd|rd)?\s+(\w+)\s+(?:to|till|-)\s+(\d{1,2})(?:th|st|nd|rd)?\s+(\w+)/i);
    if (monthRangeMatch) {
      const startDay = parseInt(monthRangeMatch[1]);
      const startMonthName = monthRangeMatch[2].toLowerCase();
      const endDay = parseInt(monthRangeMatch[3]);
      const endMonthName = monthRangeMatch[4].toLowerCase();
      
      const startMonth = this.monthNames[startMonthName];
      const endMonth = this.monthNames[endMonthName];
      
      if (startMonth !== undefined && endMonth !== undefined) {
        const year = new Date().getFullYear();
        return {
          startDate: `${year}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
          endDate: `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
        };
      }
    }

    return null;
  }

  /**
   * Parse relative dates (today, tomorrow, yesterday)
   */
  private parseRelativeDate(text: string): string | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (text.includes('today')) {
      return today.toISOString().split('T')[0];
    }

    if (text.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    if (text.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    if (text.includes('day after tomorrow')) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return dayAfter.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Parse dates with month names
   */
  private parseMonthNameDate(text: string): string | null {
    // Pattern: "15 December", "15th Dec", "December 15"
    const dayFirstPattern = /(\d{1,2})(?:th|st|nd|rd)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)(?:\s+(\d{4}))?/i;
    const monthFirstPattern = /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:th|st|nd|rd)?(?:\s+(\d{4}))?/i;

    let match = text.match(dayFirstPattern);
    if (match) {
      const day = parseInt(match[1]);
      const monthName = match[2].toLowerCase();
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      const month = this.monthNames[monthName];

      if (month !== undefined && this.isValidDate(day, month + 1, year)) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    match = text.match(monthFirstPattern);
    if (match) {
      const monthName = match[1].toLowerCase();
      const day = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      const month = this.monthNames[monthName];

      if (month !== undefined && this.isValidDate(day, month + 1, year)) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    return null;
  }

  /**
   * Validate if date is valid
   */
  private isValidDate(day: number, month: number, year: number): boolean {
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  }

  /**
   * Check if date is in the past
   */
  isPastDate(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  }

  /**
   * Get human-readable date
   */
  formatHumanReadable(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }
}

export default new DateParser();
