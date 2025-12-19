"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateParserService = void 0;
const date_fns_1 = require("date-fns");
class DateParserService {
    constructor() {
        this.ordinalSuffix = /(st|nd|rd|th)/i;
        this.monthNames = {
            jan: 0,
            january: 0,
            feb: 1,
            february: 1,
            mar: 2,
            march: 2,
            apr: 3,
            april: 3,
            may: 4,
            jun: 5,
            june: 5,
            jul: 6,
            july: 6,
            aug: 7,
            august: 7,
            sep: 8,
            sept: 8,
            september: 8,
            oct: 9,
            october: 9,
            nov: 10,
            november: 10,
            dec: 11,
            december: 11
        };
    }
    parseDates(message, referenceDate = new Date()) {
        const trimmed = (message || '').trim();
        if (!trimmed) {
            return { startDate: null, endDate: null, errors: ['No text provided'], isRange: false };
        }
        const normalized = trimmed.toLowerCase();
        const rangeResult = this.parseRange(normalized, referenceDate, trimmed);
        if (rangeResult) {
            return rangeResult;
        }
        const singleResult = this.parseSingle(normalized, referenceDate, trimmed);
        if (singleResult) {
            return singleResult;
        }
        return {
            startDate: null,
            endDate: null,
            errors: ['Unable to understand the requested date.'],
            isRange: false
        };
    }
    parseDuration(message) {
        const normalized = (message || '').toLowerCase();
        console.log('[DEBUG] parseDuration input:', normalized);
        let duration = null;
        let hasExplicitDuration = false;
        const durationMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(day|days)/);
        if (durationMatch) {
            duration = parseFloat(durationMatch[1]);
            if (!Number.isNaN(duration) && duration > 0) {
                hasExplicitDuration = true;
            }
            else {
                duration = null;
            }
        }
        // Match 'half day', 'half-day', 'a half day', 'an half day', etc.
        // Match 'half day', 'half-day', 'a half day', 'an half day', 'half a day', etc.
        const halfDayRegex = /(?:^|\s)(a|an)?\s*half([- ]?a)?[- ]?day(s)?(?:\s|$)/;
        const isHalfDay = halfDayRegex.test(normalized) ||
            (!duration && (normalized.includes('morning') || normalized.includes('afternoon')));
        if (isHalfDay) {
            duration = 0.5;
            hasExplicitDuration = true;
        }
        const debugResult = {
            durationDays: duration,
            isHalfDay,
            hasExplicitDuration
        };
        if (typeof console !== 'undefined' && console.log) {
            console.log('[DEBUG] parseDuration result:', debugResult);
        }
        return debugResult;
    }
    parseDate(text, referenceDate = new Date()) {
        const result = this.parseDates(text, referenceDate);
        if (result.startDate && result.errors.length === 0) {
            return result.startDate;
        }
        return null;
    }
    parseDateRange(text, referenceDate = new Date()) {
        const result = this.parseDates(text, referenceDate);
        if (result.isRange && result.startDate && result.endDate && result.errors.length === 0) {
            return { startDate: result.startDate, endDate: result.endDate };
        }
        return null;
    }
    isPastDate(dateString, referenceDate = new Date()) {
        const parsed = this.tryParseISO(dateString);
        if (!parsed) {
            return false;
        }
        const today = (0, date_fns_1.startOfDay)(referenceDate);
        const target = (0, date_fns_1.startOfDay)(parsed);
        return target.getTime() < today.getTime();
    }
    formatHumanReadable(dateString) {
        const parsed = this.tryParseISO(dateString);
        if (!parsed) {
            return dateString;
        }
        return (0, date_fns_1.format)(parsed, 'MMMM d, yyyy');
    }
    calculateInclusiveDays(startDate, endDate, isHalfDay = false) {
        const startParsed = this.tryParseISO(startDate);
        const endParsed = this.tryParseISO(endDate);
        if (!startParsed || !endParsed) {
            return 0;
        }
        const diff = (0, date_fns_1.differenceInCalendarDays)(endParsed, startParsed) + 1;
        if (isHalfDay) {
            return 0.5;
        }
        return diff > 0 ? diff : 0;
    }
    projectEndDate(startDate, durationDays) {
        const startParsed = this.tryParseISO(startDate);
        if (!startParsed || durationDays <= 1) {
            return startDate;
        }
        const totalDays = Math.max(1, Math.ceil(durationDays));
        const projected = (0, date_fns_1.addDays)(startParsed, totalDays - 1);
        return this.toISO(projected);
    }
    parseRange(normalized, referenceDate, raw) {
        let leftRaw = null;
        let rightRaw = null;
        const rangeToken = normalized.match(/\bfrom\b([^]+?)(?:\bto\b|\btill\b|\-)([^]+)/);
        if (rangeToken) {
            leftRaw = rangeToken[1].trim();
            rightRaw = rangeToken[2].trim();
        }
        if (!leftRaw || !rightRaw) {
            const simpleRange = raw.match(/(\d{1,2}(?:st|nd|rd|th)?(?:\s+\w+)?)\s+(?:to|till|-)\s+(\d{1,2}(?:st|nd|rd|th)?(?:\s+\w+)?)/i);
            if (simpleRange) {
                leftRaw = simpleRange[1].trim();
                rightRaw = simpleRange[2].trim();
            }
        }
        if (!leftRaw || !rightRaw) {
            return null;
        }
        const left = this.parseRangeBoundary(leftRaw, referenceDate, raw);
        const right = this.parseRangeBoundary(rightRaw, referenceDate, raw);
        const errors = [];
        if (!left.date) {
            errors.push(left.error || 'Unable to parse start date.');
        }
        if (!right.date) {
            errors.push(right.error || 'Unable to parse end date.');
        }
        if (errors.length > 0) {
            return {
                startDate: left.date,
                endDate: right.date,
                errors,
                isRange: true
            };
        }
        if (left.date && right.date) {
            const leftDate = this.tryParseISO(left.date);
            const rightDate = this.tryParseISO(right.date);
            if (!leftDate || !rightDate) {
                errors.push('Dates could not be resolved.');
            }
            else if (rightDate.getTime() < leftDate.getTime()) {
                errors.push('End date cannot be earlier than start date.');
            }
        }
        return {
            startDate: left.date,
            endDate: right.date,
            errors,
            isRange: true
        };
    }
    parseRangeBoundary(segment, referenceDate, raw) {
        const specificMonth = segment.match(/(this|next)\s+month/);
        if (specificMonth) {
            const base = (0, date_fns_1.startOfDay)(referenceDate);
            const monthOffset = specificMonth[1] === 'next' ? 1 : 0;
            const dayMatch = segment.match(/(\d{1,2})/);
            if (!dayMatch) {
                return { date: null, error: 'Could not determine day for range.' };
            }
            const day = parseInt(dayMatch[1], 10);
            const candidate = new Date(base.getFullYear(), base.getMonth() + monthOffset, day);
            return this.validateDate(candidate, day, candidate.getMonth(), segment, raw);
        }
        const monthRange = segment.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}))?/);
        if (monthRange) {
            const day = parseInt(monthRange[1], 10);
            const monthName = monthRange[2].toLowerCase();
            const year = monthRange[3] ? parseInt(monthRange[3], 10) : referenceDate.getFullYear();
            if (!(monthName in this.monthNames)) {
                return { date: null, error: `Unknown month in "${segment}".` };
            }
            const monthIndex = this.monthNames[monthName];
            const candidate = new Date(year, monthIndex, day);
            return this.validateDate(candidate, day, monthIndex, segment, raw);
        }
        const numericRange = segment.match(/(\d{1,2})(?:st|nd|rd|th)?/);
        if (numericRange) {
            const day = parseInt(numericRange[1], 10);
            const candidate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day);
            return this.validateDate(candidate, day, candidate.getMonth(), segment, raw);
        }
        const fallback = this.parseSingle(segment.toLowerCase(), referenceDate, raw);
        if (!fallback || !fallback.startDate) {
            return { date: null, error: `Could not understand "${segment}".` };
        }
        return { date: fallback.startDate };
    }
    parseSingle(normalized, referenceDate, raw) {
        const relativeDate = this.parseRelative(normalized, referenceDate);
        if (relativeDate) {
            return {
                startDate: relativeDate,
                endDate: relativeDate,
                errors: [],
                isRange: false
            };
        }
        const weekdayDate = this.parseWeekday(normalized, referenceDate);
        if (weekdayDate) {
            return {
                startDate: weekdayDate,
                endDate: weekdayDate,
                errors: [],
                isRange: false
            };
        }
        const absoluteDate = this.parseAbsolute(raw, referenceDate);
        if (absoluteDate) {
            if (absoluteDate.error) {
                return {
                    startDate: absoluteDate.date,
                    endDate: absoluteDate.date,
                    errors: [absoluteDate.error],
                    isRange: false
                };
            }
            return {
                startDate: absoluteDate.date,
                endDate: absoluteDate.date,
                errors: [],
                isRange: false
            };
        }
        return null;
    }
    parseRelative(normalized, referenceDate) {
        const base = (0, date_fns_1.startOfDay)(referenceDate);
        if (normalized.includes('day after tomorrow')) {
            return this.toISO((0, date_fns_1.addDays)(base, 2));
        }
        if (normalized.includes('tomorrow')) {
            return this.toISO((0, date_fns_1.addDays)(base, 1));
        }
        if (normalized.includes('yesterday')) {
            return this.toISO((0, date_fns_1.subDays)(base, 1));
        }
        if (normalized.includes('today')) {
            return this.toISO(base);
        }
        return null;
    }
    parseWeekday(normalized, referenceDate) {
        const weekdayMatch = normalized.match(/\b(next|this|coming)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
        if (!weekdayMatch) {
            return null;
        }
        const keyword = weekdayMatch[1];
        const dayName = weekdayMatch[2];
        const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);
        const today = (0, date_fns_1.startOfDay)(referenceDate);
        if (keyword === 'this') {
            const candidate = this.resolveThisWeekday(today, targetDay);
            return this.toISO(candidate);
        }
        let daysToAdd = (targetDay - today.getDay() + 7) % 7;
        if (daysToAdd === 0) {
            daysToAdd = 7;
        }
        return this.toISO((0, date_fns_1.addDays)(today, daysToAdd));
    }
    resolveThisWeekday(today, targetDay) {
        const currentDay = today.getDay();
        if (currentDay === targetDay) {
            return today;
        }
        if (currentDay < targetDay) {
            return (0, date_fns_1.addDays)(today, targetDay - currentDay);
        }
        return (0, date_fns_1.addDays)(today, 7 - (currentDay - targetDay));
    }
    parseAbsolute(raw, referenceDate) {
        const iso = raw.match(/(\d{4}-\d{2}-\d{2})/);
        if (iso) {
            const parsedISO = (0, date_fns_1.parseISO)(iso[1]);
            if (!Number.isNaN(parsedISO.getTime())) {
                return { date: this.toISO(parsedISO) };
            }
            return { date: null, error: 'Invalid ISO date provided.' };
        }
        const numericWithYear = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
        if (numericWithYear) {
            const day = parseInt(numericWithYear[1], 10);
            const month = parseInt(numericWithYear[2], 10) - 1;
            const year = parseInt(numericWithYear[3], 10);
            const candidate = new Date(year, month, day);
            return this.validateDate(candidate, day, month, raw, raw);
        }
        const numericNoYear = raw.match(/(\d{1,2})[./-](\d{1,2})(?![./-]\d)/);
        if (numericNoYear) {
            const day = parseInt(numericNoYear[1], 10);
            const month = parseInt(numericNoYear[2], 10) - 1;
            const year = referenceDate.getFullYear();
            const candidate = new Date(year, month, day);
            return this.validateDate(candidate, day, month, raw, raw);
        }
        const monthPattern = new RegExp(`(\d{1,2})(?:${this.ordinalSuffix.source})?\s+(${Object.keys(this.monthNames).join('|')})(?:\s+(\d{4}))?`, 'i');
        const dayFirstMatch = raw.match(monthPattern);
        if (dayFirstMatch) {
            const day = parseInt(dayFirstMatch[1], 10);
            const monthName = dayFirstMatch[2].toLowerCase();
            const year = dayFirstMatch[3] ? parseInt(dayFirstMatch[3], 10) : referenceDate.getFullYear();
            if (!(monthName in this.monthNames)) {
                return { date: null, error: `Unknown month in "${raw}".` };
            }
            const month = this.monthNames[monthName];
            const candidate = new Date(year, month, day);
            return this.validateDate(candidate, day, month, raw, raw);
        }
        const monthFirstPattern = new RegExp(`(${Object.keys(this.monthNames).join('|')})\s+(\d{1,2})(?:${this.ordinalSuffix.source})?(?:\s+(\d{4}))?`, 'i');
        const monthFirstMatch = raw.match(monthFirstPattern);
        if (monthFirstMatch) {
            const monthName = monthFirstMatch[1].toLowerCase();
            const day = parseInt(monthFirstMatch[2], 10);
            const year = monthFirstMatch[3] ? parseInt(monthFirstMatch[3], 10) : referenceDate.getFullYear();
            const month = this.monthNames[monthName];
            const candidate = new Date(year, month, day);
            return this.validateDate(candidate, day, month, raw, raw);
        }
        const loneDay = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
        if (loneDay) {
            const day = parseInt(loneDay[1], 10);
            const candidate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day);
            return this.validateDate(candidate, day, candidate.getMonth(), raw, raw);
        }
        return null;
    }
    validateDate(candidate, day, monthIndex, segment, raw) {
        if (Number.isNaN(candidate.getTime())) {
            return { date: null, error: `Invalid date in "${segment}".` };
        }
        if (candidate.getDate() !== day || candidate.getMonth() !== monthIndex) {
            return { date: null, error: `Invalid day for the specified month in "${segment}".` };
        }
        return { date: this.toISO(candidate) };
    }
    tryParseISO(value) {
        const parsed = (0, date_fns_1.parseISO)(value);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        return parsed;
    }
    toISO(date) {
        return (0, date_fns_1.format)((0, date_fns_1.startOfDay)(date), 'yyyy-MM-dd');
    }
}
exports.DateParserService = DateParserService;
const dateParserService = new DateParserService();
exports.default = dateParserService;
//# sourceMappingURL=dateParser.js.map