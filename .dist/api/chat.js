"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        // Return a simple test response
        // In production, integrate with your actual chatbot logic
        return res.status(200).json({
            reply: 'HR Bot is working. You said: ' + message,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error in chat handler:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=chat.js.map