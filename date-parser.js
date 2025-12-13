// Enhanced Date Parser - Understands multiple date formats
class DateParser {
  constructor() {
    // Month name mappings
    this.monthNames = {
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

    // Relative day mappings
    this.relativeDays = {
      'today': 0,
      'tomorrow': 1,
      'day after tomorrow': 2,
      'next week': 7
    };
  }

  /**
   * Parse date from natural language input
   * Supports formats:
   * - 15.1.2025, 15.01.2025
   * - 15-1-2025, 15-01-2025
   * - 15/1/2025, 15/01/2025
   * - 15 jan, 15th jan, 15 january
   * - jan 15, january 15th
   * - 15 jan 2025, jan 15 2025
   * - 2025-01-15 (ISO)
   * - today, tomorrow
   */
  parseDate(text) {
    if (!text) return null;

    // Normalize text: lowercase, remove extra spaces, remove ordinal indicators, remove commas
    const normalized = text.toLowerCase()
      .trim()
      .replace(/,/g, '')  // Remove commas
      .replace(/\s+/g, ' ')
      .replace(/(\d+)\s*(st|nd|rd|th)\s*/g, '$1 ');  // Remove ordinals with optional space

    // Try each parser in order
    const parsers = [
      () => this.parseRelativeDate(normalized),
      () => this.parseNumericDate(normalized),
      () => this.parseMonthNameDate(normalized),
      () => this.parseISODate(normalized)
    ];

    for (const parser of parsers) {
      const result = parser();
      if (result) {
        return this.formatDate(result);
      }
    }

    return null;
  }

  /**
   * Parse relative dates: today, tomorrow, etc.
   */
  parseRelativeDate(text) {
    for (const [keyword, daysOffset] of Object.entries(this.relativeDays)) {
      if (text.includes(keyword)) {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        return date;
      }
    }
    return null;
  }

  /**
   * Parse numeric dates: 15.1.2025, 15-01-2025, 15/1/2025
   */
  parseNumericDate(text) {
    // Match patterns like: 15.1.2025, 15-1-2025, 15/1/2025
    const patterns = [
      /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/,  // 15.1.2025
      /(\d{1,2})[.\-/](\d{1,2})/,                // 15.1 (assume current year)
      /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/   // 2025.1.15 or 2025-01-15
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let day, month, year;

        if (pattern.source.startsWith('(\\d{4})')) {
          // Format: 2025-01-15
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else {
          // Format: 15.1.2025 or 15.1
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
        }

        // Validate date
        if (this.isValidDate(day, month, year)) {
          return new Date(year, month, day);
        }
      }
    }

    return null;
  }

  /**
   * Parse dates with month names: 15 jan, jan 15, 15th january 2025
   */
  parseMonthNameDate(text) {
    // Remove ordinal suffixes (st, nd, rd, th)
    const cleanText = text.replace(/(\d+)(st|nd|rd|th)/g, '$1');

    // Sort month names by length (longest first) to match "march" before "mar"
    const sortedMonths = Object.entries(this.monthNames).sort((a, b) => b[0].length - a[0].length);

    // Pattern 1: "15 jan", "15 january", "15 jan 2027"
    for (const [monthName, monthIndex] of sortedMonths) {
      // Use string concatenation instead of template literals to avoid escaping issues
      const pattern1 = new RegExp('(\\d{1,2})\\s+' + monthName + '(?:\\s+(\\d{4}))?', 'i');
      const match1 = cleanText.match(pattern1);
      if (match1) {
        const day = parseInt(match1[1]);
        const year = match1[2] ? parseInt(match1[2]) : new Date().getFullYear();
        
        if (this.isValidDate(day, monthIndex, year)) {
          return new Date(year, monthIndex, day);
        }
      }

      // Pattern 2: "jan 15", "january 15th", "jan 15 2027"
      const pattern2 = new RegExp(monthName + '\\s+(\\d{1,2})(?:\\s+(\\d{4}))?', 'i');
      const match2 = cleanText.match(pattern2);
      if (match2) {
        const day = parseInt(match2[1]);
        const year = match2[2] ? parseInt(match2[2]) : new Date().getFullYear();
        
        if (this.isValidDate(day, monthIndex, year)) {
          return new Date(year, monthIndex, day);
        }
      }
    }

    return null;
  }

  /**
   * Parse ISO format: 2025-01-15
   */
  parseISODate(text) {
    const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      
      if (this.isValidDate(day, month, year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  }

  /**
   * Validate if date components are valid
   */
  isValidDate(day, month, year) {
    if (day < 1 || day > 31) return false;
    if (month < 0 || month > 11) return false;
    if (year < 1900 || year > 2100) return false;

    // Check if day is valid for the month
    const date = new Date(year, month, day);
    return date.getMonth() === month && date.getDate() === day;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Extract date from a larger text string
   */
  extractDate(text) {
    if (!text) return null;

    // Try to find date patterns in the text
    const words = text.split(' ');
    
    // Try parsing the whole text first
    let result = this.parseDate(text);
    if (result) return result;

    // Try parsing substrings
    for (let i = 0; i < words.length; i++) {
      for (let len = 1; len <= Math.min(5, words.length - i); len++) {
        const substring = words.slice(i, i + len).join(' ');
        result = this.parseDate(substring);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Format date for display
   */
  formatForDisplay(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
}

module.exports = new DateParser();
