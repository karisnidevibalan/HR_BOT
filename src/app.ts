// src/app.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import path from 'path';

// __filename and __dirname are available in CommonJS modules (Node.js)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CommonJS: __filename and __dirname are available by default

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Import controllers and services
import { chatController } from './controllers/chatController';
import { SalesforceService } from './services/salesforceService';
import managerRoutes from './routes/managerRoutes';
const salesforceService = new SalesforceService();

// Routes
app.post('/api/chat', chatController);

// Manager approval routes (email links)
app.get('/manager-dashboard', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/manager-dashboard.html'));
});
app.get('/approve', async (req: Request, res: Response) => {
  try {
    const { id, action, token } = req.query;

    // Validate required parameters
    if (!id || !action || !token) {
      return res.status(400).send(`
        <html>
          <head><title>Invalid Request</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>❌ Invalid Request</h1>
            <p>Missing required parameters: id, action, or token</p>
          </body>
        </html>
      `);
    }

    // Verify token matches record ID for security
    if (token !== id) {
      return res.status(403).send(`
        <html>
          <head><title>Invalid Token</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>🔒 Invalid Token</h1>
            <p>The approval link is invalid or has expired.</p>
          </body>
        </html>
      `);
    }

    // Get the record
    const record = await salesforceService.getRecord(id as string);

    if (!record.success) {
      return res.status(404).send(`
        <html>
          <head><title>Record Not Found</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>❌ Record Not Found</h1>
            <p>The leave request could not be found.</p>
          </body>
        </html>
      `);
    }

    const leaveRecord = record.record;

    // Determine Salesforce instance URL
    const instanceUrl = process.env.SALESFORCE_LOGIN_URL?.includes('test')
      ? 'https://winfomi--dev7.sandbox.my.salesforce.com'
      : 'https://winfomi.my.salesforce.com';
    const recordUrl = `${instanceUrl}/${id}`;

    if (action === 'approve') {
      // Update record status to Approved
      const updated = await salesforceService.updateRecordStatus(id as string, 'Approved');

      if (!updated.success) {
        throw new Error(updated.error || 'Failed to update record');
      }

      return res.send(`
        <html>
          <head>
            <title>Leave Approved</title>
            <style>
              body { font-family: Arial; padding: 40px; max-width: 600px; margin: 0 auto; }
              .success { background: #4CAF50; color: white; padding: 20px; border-radius: 8px; }
              .details { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
              .button { display: inline-block; background: #0070d2; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 4px; margin-top: 20px; }
              .button:hover { background: #005fb2; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ Leave Request Approved!</h1>
            </div>
            <div class="details">
              <h3>The leave request has been successfully approved.</h3>
              <p><strong>Record ID:</strong> ${id}</p>
              <p><strong>Employee:</strong> ${leaveRecord.Employee_Name__c || 'N/A'}</p>
              <p><strong>Leave Type:</strong> ${leaveRecord.Leave_Type__c || 'N/A'}</p>
            </div>
            <p>The employee will be notified via email about this decision.</p>
            <p style="text-align: center;">
              <a href="${recordUrl}" class="button" target="_blank">View in Salesforce</a>
            </p>
          </body>
        </html>
      `);
    } else if (action === 'reject') {
      // Update record status to Rejected
      const updated = await salesforceService.updateRecordStatus(id as string, 'Rejected');

      if (!updated.success) {
        throw new Error(updated.error || 'Failed to update record');
      }

      return res.send(`
        <html>
          <head>
            <title>Leave Rejected</title>
            <style>
              body { font-family: Arial; padding: 40px; max-width: 600px; margin: 0 auto; }
              .reject { background: #f44336; color: white; padding: 20px; border-radius: 8px; }
              .details { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
              .button { display: inline-block; background: #0070d2; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 4px; margin-top: 20px; }
              .button:hover { background: #005fb2; }
            </style>
          </head>
          <body>
            <div class="reject">
              <h1>❌ Leave Request Rejected</h1>
            </div>
            <div class="details">
              <h3>Leave Details:</h3>
              <p><strong>Employee:</strong> ${leaveRecord.Employee_Name__c || 'N/A'}</p>
              <p><strong>Leave Type:</strong> ${leaveRecord.Leave_Type__c || 'N/A'}</p>
              <p><strong>Start Date:</strong> ${leaveRecord.Start_Date__c || 'N/A'}</p>
              <p><strong>End Date:</strong> ${leaveRecord.End_Date__c || 'N/A'}</p>
              <p><strong>Reason:</strong> ${leaveRecord.Reason__c || 'N/A'}</p>
              <p><strong>Status:</strong> <span style="color: red;">Rejected</span></p>
            </div>
            <p>The employee will be notified via email about this decision.</p>
            <p style="text-align: center;">
              <a href="${recordUrl}" class="button" target="_blank">View in Salesforce</a>
            </p>
          </body>
        </html>
      `);
    } else {
      return res.status(400).send(`
        <html>
          <head><title>Invalid Action</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>❌ Invalid Action</h1>
            <p>Action must be either 'approve' or 'reject'</p>
          </body>
        </html>
      `);
    }
  } catch (error: any) {
    console.error('❌ Approval Error:', error.message);
    return res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>❌ Error Processing Request</h1>
          <p>An error occurred while processing your request. Please try again later.</p>
          <p style="color: gray; font-size: 12px;">${error.message || 'Unknown error'}</p>
        </body>
      </html>
    `);
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'HR Agent Bot is running',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true'
  });
});

// Serve the chat interface
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manager dashboard routes
app.use('/api/manager', managerRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Error handler middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

export { app };
export default app;

// Start server if this is the main module
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🤖 HR Agent Bot running on http://localhost:${PORT}`);
    console.log(`📋 Demo Mode: ${process.env.DEMO_MODE === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🏢 Company: ${process.env.COMPANY_NAME || 'Winfomi'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}
