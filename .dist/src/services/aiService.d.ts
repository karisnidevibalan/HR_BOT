export declare class AiService {
    private buildSystemPrompt;
    processMessage(message: string, context?: any): Promise<string>;
    detectIntent(message: string): string;
    parseQuery(query: string): any;
    generateResponse(parsedQuery: any): string;
}
//# sourceMappingURL=aiService.d.ts.map