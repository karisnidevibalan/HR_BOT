import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    message: 'HR Bot API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
