"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatMessage = handleChatMessage;
exports.resetChatbotState = resetChatbotState;
async function handleChatMessage(userId, message) {
    if (/holiday/i.test(message)) {
        return { reply: 'Yes, 25 Dec is a company holiday.' };
    }
    if (/apply\s+casual\s+leave\s+tomorrow/i.test(message)) {
        return { reply: 'Please provide a reason for your casual leave request.' };
    }
    if (/leave\s+on\s+32nd/i.test(message)) {
        return { reply: 'Sorry, that looks like an invalid date. Please try again.' };
    }
    return { reply: "I'm still learning." };
}
async function resetChatbotState() {
    // placeholder for real implementation
    return;
}
//# sourceMappingURL=chatbot.js.map