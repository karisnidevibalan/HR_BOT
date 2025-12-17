import { handleChatMessage } from '../src/chatbot';

beforeEach(() => {
	jest.clearAllMocks();
});

test('Policy Q&A responds about holidays', async () => {
	const response = await handleChatMessage('user-1', 'Is 25 Dec a holiday?');
	expect(response.reply).toMatch(/holiday/i);
});

test('Leave request prompts for reason', async () => {
	const response = await handleChatMessage('user-2', 'Apply casual leave tomorrow');
	expect(response.reply).toMatch(/reason/i);
});

test('Invalid date message noted', async () => {
	const response = await handleChatMessage('user-3', 'Leave on 32nd');
	expect(response.reply).toMatch(/invalid date/i);
});
