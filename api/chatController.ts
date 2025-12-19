import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // For now, return a simple test response
    // In production, you would call your actual chatbot logic here
    return res.status(200).json({
      reply: 'HR Bot is working. You said: ' + message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in chat handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
