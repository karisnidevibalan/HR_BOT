import { AiService } from '../../src/services/aiService';

describe('AiService', () => {
    let aiService: AiService;

    beforeEach(() => {
        aiService = new AiService();
    });

    describe('detectIntent', () => {
        it('should detect leave application intent', () => {
            const query = 'I would like to apply for leave';
            const result = aiService.detectIntent(query);
            expect(result).toBe('apply_leave');
        });

        it('should detect work from home intent', () => {
            const query = 'Can I work from home tomorrow?';
            const result = aiService.detectIntent(query);
            expect(result).toBe('apply_wfh');
        });

        it('should detect leave policy query', () => {
            const query = 'What is the leave policy?';
            const result = aiService.detectIntent(query);
            expect(result).toBe('leave_policy');
        });

        it('should detect holiday list query', () => {
            const query = 'Show me the holiday calendar';
            const result = aiService.detectIntent(query);
            expect(result).toBe('holiday_list');
        });

        it('should return general_query for unrecognized queries', () => {
            const query = 'What is the weather today?';
            const result = aiService.detectIntent(query);
            expect(result).toBe('general_query');
        });
    });

    describe('processMessage', () => {
        it('should process a message and return a response', async () => {
            const message = 'Hello';
            const response = await aiService.processMessage(message);
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        }, 10000); // 10 second timeout for API call

        it('should handle context in message processing', async () => {
            const message = 'Tell me about leave policy';
            const context = {
                history: [
                    { message: 'Hello', intent: 'general_query' }
                ]
            };
            const response = await aiService.processMessage(message, context);
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
        }, 10000);
    });
});