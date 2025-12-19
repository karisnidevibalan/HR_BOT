import { VercelRequest, VercelResponse } from '@vercel/node';
import { leaveController } from '../src/controllers/leaveController';
import { Request, Response } from 'express';

export default async function handler(vercelReq: VercelRequest, vercelRes: VercelResponse) {
  // Create Express-like request and response objects
  const req = {
    ...vercelReq,
    body: vercelReq.body,
    method: vercelReq.method,
    headers: vercelReq.headers,
    params: vercelReq.query, // Map query params to params for Express compatibility
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

  try {
    // Route to the appropriate controller method based on HTTP method
    if (vercelReq.method === 'POST') {
      await leaveController.applyLeave(req, res);
    } else if (vercelReq.method === 'GET') {
      // Create a properly typed request object for getLeaveStatus
      const getStatusReq = {
        ...req,
        params: { id: vercelReq.query.id as string }
      } as unknown as Request<{ id: string }>;
      await leaveController.getLeaveStatus(getStatusReq, res);
    } else {
      return vercelRes.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in Leave API:', error);
    return vercelRes.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
