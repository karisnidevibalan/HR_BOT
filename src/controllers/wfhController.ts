import { Request, Response } from 'express';
import { SalesforceService } from '../services/salesforceService';

const salesforceService = new SalesforceService();

export const wfhController = {
  async applyWFH(req: Request, res: Response) {
    try {
      const { employeeName, date, reason } = req.body;

      // Validate required fields
      if (!employeeName || !date) {
        return res.status(400).json({ 
          error: 'Missing required fields: employeeName, date' 
        });
      }

      console.log('🏠 WFH application received:', { employeeName, date, reason });

      // Create WFH record in Salesforce (mock)
      const result = await salesforceService.createWfhRecord({
        employeeName,
        date,
        reason: reason || 'No reason provided'
      });

      if (result.success) {
        res.json({
          success: true,
          message: `✅ Work From Home request submitted successfully!`,
          details: {
            recordId: result.id,
            employeeName: employeeName,
            date: date,
            reason: reason || 'No reason provided',
            status: 'Approved', // Auto-approved in demo
            submittedAt: new Date().toISOString(),
            nextSteps: 'Your WFH request has been automatically approved. Please ensure you have proper internet connectivity and VPN access.'
          }
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to create WFH record',
          details: result.error 
        });
      }

    } catch (error) {
      console.error('WFH Controller Error:', error);
      res.status(500).json({ 
        error: 'Failed to process WFH application. Please try again.'
      });
    }
  },

  async getWFHStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const result = await salesforceService.getRecord(id);
      
      if (result.success) {
        res.json({
          success: true,
          record: result.record
        });
      } else {
        res.status(404).json({
          error: 'WFH record not found'
        });
      }
    } catch (error) {
      console.error('Get WFH Status Error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve WFH status'
      });
    }
  }
};