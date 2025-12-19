import { Request, Response } from 'express';
import { SalesforceService } from '../services/salesforceService';
import path from 'path';
import fs from 'fs/promises';

const salesforceService = new SalesforceService();

interface Holiday {
  date: string;
  name: string;
  type?: string;
}

interface LeaveRequestBody {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

interface LeaveRecord {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  submittedAt: string;
  nextSteps: string;
}

export const leaveController = {
  async applyLeave(req: Request<{}, {}, LeaveRequestBody>, res: Response) {
    try {
      const { employeeName, leaveType, startDate, endDate, reason } = req.body;

      // Validate required fields with type checking
      if (!employeeName || !leaveType || !startDate || !endDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: employeeName, leaveType, startDate, endDate' 
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({
          error: 'Invalid date format. Please use YYYY-MM-DD format'
        });
      }

      // Load holidays from holidays.json
      const holidaysPath = path.join(__dirname, '../../data/holidays.json');
      let holidaysList: Holiday[] = [];
      
      try {
        const holidaysData = await fs.readFile(holidaysPath, 'utf-8');
        const holidaysJson = JSON.parse(holidaysData);
        holidaysList = Array.isArray(holidaysJson.holidays) ? holidaysJson.holidays : [];
      } catch (e) {
        console.error('Failed to load holidays.json:', e);
        // Continue without holidays if file can't be loaded
      }

      // Check if requested leave date(s) overlap with a holiday
      const leaveDates: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate date range
      if (start > end) {
        return res.status(400).json({
          error: 'End date cannot be before start date'
        });
      }

      // Generate array of leave dates
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        leaveDates.push(d.toISOString().slice(0, 10));
      }

      const holidayDates = holidaysList.map(h => h.date);
      const conflictHoliday = holidaysList.find(holiday => 
        leaveDates.includes(holiday.date)
      );

      if (conflictHoliday) {
        return res.status(400).json({
          error: `Cannot apply leave on ${conflictHoliday.date} (${conflictHoliday.name}). It is a company holiday.` 
        });
      }

      console.log('📝 Leave application received:', { employeeName, leaveType, startDate, endDate });

      // Create leave record in Salesforce
      const result = await salesforceService.createLeaveRecord({
        employeeName,
        leaveType,
        startDate,
        endDate,
        reason: reason || 'No reason provided'
      });

      if (result?.success && result.id) {
        const responseData: LeaveRecord = {
          id: result.id,
          employeeName,
          leaveType,
          startDate,
          endDate,
          status: 'Pending Approval',
          submittedAt: new Date().toISOString(),
          nextSteps: 'Your manager will review and approve your leave request within 2 business days.'
        };

        return res.json({
          success: true,
          message: '✅ Leave application submitted successfully!',
          details: responseData
        });
      }

      return res.status(500).json({ 
        error: 'Failed to create leave record',
        details: result?.error || 'Unknown error occurred'
      });

    } catch (error: unknown) {
      console.error('Leave Controller Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ 
        error: 'Failed to process leave application',
        details: errorMessage
      });
    }
  },

  async getLeaveStatus(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          error: 'Missing leave record ID'
        });
      }
      
      const result = await salesforceService.getRecord(id);
      
      if (result?.success) {
        return res.json({
          success: true,
          record: result.record
        });
      }
      
      return res.status(404).json({
        error: 'Leave record not found'
      });
      
    } catch (error: unknown) {
      console.error('Get Leave Status Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ 
        error: 'Failed to retrieve leave status',
        details: errorMessage
      });
    }
  }
};