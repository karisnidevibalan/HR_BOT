import { chatController } from '../../src/controllers/chatController';
import { Request, Response } from 'express';
import contextManager from '../../src/utils/contextManager';

describe('ChatController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        mockRequest = {
            body: {},
            headers: {}
        };
        mockResponse = {
            json: jsonMock,
            status: jest.fn().mockReturnThis(),
        };
    });

    describe('chatController', () => {
        it('should return error if message is missing', async () => {
            mockRequest.body = {};
            await chatController(mockRequest as Request, mockResponse as Response);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Message is required' });
        });

        it('should ask for email on first message', async () => {
            mockRequest.body = { message: 'Hello' };
            mockRequest.headers = { 'x-session-id': 'new-session-001' };
            await chatController(mockRequest as Request, mockResponse as Response);
            expect(jsonMock).toHaveBeenCalled();
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('reply');
            expect(response.reply).toContain('email');
        });

        it('should handle leave policy query after email is set', async () => {
            const sessionId = 'test-session-policy';
            mockRequest.headers = { 'x-session-id': sessionId };
            
            // Set email for this session
            contextManager.setUserEmail(sessionId, 'test@winfomi.com');
            
            mockRequest.body = { message: 'What is the leave policy?' };
            await chatController(mockRequest as Request, mockResponse as Response);
            expect(jsonMock).toHaveBeenCalled();
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('reply');
            expect(response.reply).toContain('Leave Policy');
        });

        it('should handle holiday list query', async () => {
            const sessionId = 'test-session-holiday';
            mockRequest.headers = { 'x-session-id': sessionId };
            
            // Set email for this session
            contextManager.setUserEmail(sessionId, 'test@winfomi.com');
            
            mockRequest.body = { message: 'Show me the holiday calendar' };
            await chatController(mockRequest as Request, mockResponse as Response);
            expect(jsonMock).toHaveBeenCalled();
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('reply');
            expect(response.reply).toContain('Holiday');
        });
    });
});