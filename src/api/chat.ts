import { VercelRequest, VercelResponse } from '@vercel/node';
import { chatController } from '../controllers/chatController';
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

interface MockResponse {
  statusCode?: number;
  body?: any;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
  setHeader: () => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mockReq = {
      ...req,
      body: req.body,
      method: req.method,
      headers: req.headers
    };
    
    const mockRes: MockResponse = {
      statusCode: undefined,
      body: undefined,
      status: function(code: number) {
        this.statusCode = code;
        return this;
      },
      json: function(data: any) {
        this.body = data;
        return this;
      },
      setHeader: () => {}
    };

    await chatController(mockReq as any, mockRes as any);

    if (mockRes.statusCode) {
      res.status(mockRes.statusCode);
    }
    
    return res.json(mockRes.body || { status: 'success' });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}