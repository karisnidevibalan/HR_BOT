
// Adapted from src/controllers/wfhController.ts for Vercel serverless
import { SalesforceService } from '../../src/services/salesforceService';

const salesforceService = new SalesforceService();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Apply WFH logic
    try {
      const { employeeName, date, reason } = req.body;
      if (!employeeName || !date) {
        return res.status(400).json({ error: 'Missing required fields: employeeName, date' });
      }
      const result = await salesforceService.createWfhRecord({ employeeName, date, reason: reason || 'No reason provided' });
      if (result.success) {
        res.json({
          success: true,
          message: `✅ Work From Home request submitted successfully!`,
          details: {
            recordId: result.id,
            employeeName: employeeName,
            date: date,
            reason: reason || 'No reason provided',
            status: 'Approved',
            submittedAt: new Date().toISOString(),
            nextSteps: 'Your WFH request has been automatically approved. Please ensure you have proper internet connectivity and VPN access.'
          }
        });
      } else {
        res.status(500).json({ error: 'Failed to create WFH record', details: result.error });
      }
    } catch (error) {
      console.error('WFH Controller Error:', error);
      res.status(500).json({ error: 'Failed to process WFH application. Please try again.' });
    }
  } else if (req.method === 'GET') {
    // Get WFH status logic
    try {
      const { id } = req.query;
      const result = await salesforceService.getRecord(id);
      if (result.success) {
        res.json({ success: true, record: result.record });
      } else {
        res.status(404).json({ error: 'WFH record not found' });
      }
    } catch (error) {
      console.error('Get WFH Status Error:', error);
      res.status(500).json({ error: 'Failed to retrieve WFH status' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
