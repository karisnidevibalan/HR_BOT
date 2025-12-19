import { VercelRequest, VercelResponse } from '@vercel/node';
import { chatController } from '../src/controllers/chatController';
import { Request, Response } from 'express';

export default async function handler(vercelReq: VercelRequest, vercelRes: VercelResponse) {
  if (vercelReq.method !== 'POST') {
    return vercelRes.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create Express-like request and response objects
    const req = {
      ...vercelReq,
      body: vercelReq.body,
      method: vercelReq.method,
      headers: vercelReq.headers,
      get: (header: string) => vercelReq.headers[header.toLowerCase()] as string | undefined,
    } as unknown as Request;

    const res = {
      status: (code: number) => {
        vercelRes.status(code);
        return {
          json: (data: any) => vercelRes.json(data),
          send: (data: any) => vercelRes.send(data),
        };
      },
      json: (data: any) => vercelRes.json(data),
      send: (data: any) => vercelRes.send(data),
      setHeader: (name: string, value: string) => vercelRes.setHeader(name, value),
    } as unknown as Response;

    // Call the chat controller
    await chatController(req, res);
  } catch (error) {
    console.error('Error in chat API:', error);
    return vercelRes.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}