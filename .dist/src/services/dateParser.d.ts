export interface DateParseResult {
    startDate: string | null;
    endDate: string | null;
    errors: string[];
    isRange: boolean;
}
export interface DateRange {
    startDate: string;
    endDate: string;
}
export interface DurationParseResult {
    durationDays: number | null;
    isHalfDay: boolean;
    hasExplicitDuration: boolean;
}
export declare class DateParserService {
    private readonly ordinalSuffix;
    private readonly monthNames;
    parseDates(message: string, referenceDate?: Date): DateParseResult;
    parseDuration(message: string): DurationParseResult;
    parseDate(text: string, referenceDate?: Date): string | null;
    parseDateRange(text: string, referenceDate?: Date): DateRange | null;
    isPastDate(dateString: string, referenceDate?: Date): boolean;
    formatHumanReadable(dateString: string): string;
    calculateInclusiveDays(startDate: string, endDate: string, isHalfDay?: boolean): number;
    projectEndDate(startDate: string, durationDays: number): string;
    private parseRange;
    private parseRangeBoundary;
    private parseSingle;
    private parseRelative;
    private parseWeekday;
    private resolveThisWeekday;
    private parseAbsolute;
    private validateDate;
    private tryParseISO;
    private toISO;
}
declare const dateParserService: DateParserService;
export default dateParserService;
//# sourceMappingURL=dateParser.d.ts.map