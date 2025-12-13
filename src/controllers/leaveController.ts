import { Request, Response } from 'express';
import { SalesforceService } from '../services/salesforceService';

const salesforceService = new SalesforceService();

export const leaveController = {
  async applyLeave(req: Request, res: Response) {
    try {
      const { employeeName, leaveType, startDate, endDate, reason } = req.body;

      // Validate required fields
      if (!employeeName || !leaveType || !startDate || !endDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: employeeName, leaveType, startDate, endDate' 
        });
      }

      console.log('📝 Leave application received:', { employeeName, leaveType, startDate, endDate });

      // Create leave record in Salesforce (mock)
      const result = await salesforceService.createLeaveRecord({
        employeeName,
        leaveType,
        startDate,
        endDate,
        reason: reason || 'No reason provided'
      });

      if (result.success) {
        res.json({
          success: true,
          message: `✅ Leave application submitted successfully!`,
          details: {
            recordId: result.id,
            employeeName: employeeName,
            leaveType: leaveType,
            startDate: startDate,
            endDate: endDate,
            status: 'Pending Approval',
            submittedAt: new Date().toISOString(),
            nextSteps: 'Your manager will review and approve your leave request within 2 business days.'
          }
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to create leave record',
          details: result.error 
        });
      }

    } catch (error) {
      console.error('Leave Controller Error:', error);
      res.status(500).json({ 
        error: 'Failed to process leave application. Please try again.'
      });
    }
  },

  async getLeaveStatus(req: Request, res: Response) {
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
          error: 'Leave record not found'
        });
      }
    } catch (error) {
      console.error('Get Leave Status Error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve leave status'
      });
    }
  }
};