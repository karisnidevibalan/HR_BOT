
// Adapted from src/controllers/leaveController.ts for Vercel serverless
import { SalesforceService } from '../../src/services/salesforceService';
import path from 'path';
import fs from 'fs';

const salesforceService = new SalesforceService();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Apply leave logic
    try {
      const { employeeName, leaveType, startDate, endDate, reason } = req.body;
      if (!employeeName || !leaveType || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields: employeeName, leaveType, startDate, endDate' });
      }
      const holidaysPath = path.join(__dirname, '../../data/holidays.json');
      let holidaysList = [];
      try {
        const holidaysData = fs.readFileSync(holidaysPath, 'utf-8');
        const holidaysJson = JSON.parse(holidaysData);
        holidaysList = holidaysJson.holidays || [];
      } catch (e) {
        console.error('Failed to load holidays.json:', e);
      }
      const leaveDates = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        leaveDates.push(d.toISOString().slice(0, 10));
      }
      const holidayDates = holidaysList.map(h => h.date);
      const conflictHoliday = leaveDates.find(date => holidayDates.includes(date));
      if (conflictHoliday) {
        const holidayObj = holidaysList.find(h => h.date === conflictHoliday);
        return res.status(400).json({ error: `Cannot apply leave on ${conflictHoliday} (${holidayObj?.name || 'Holiday'}). It is a company holiday.` });
      }
      const result = await salesforceService.createLeaveRecord({ employeeName, leaveType, startDate, endDate, reason: reason || 'No reason provided' });
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
        res.status(500).json({ error: 'Failed to create leave record', details: result.error });
      }
    } catch (error) {
      console.error('Leave Controller Error:', error);
      res.status(500).json({ error: 'Failed to process leave application. Please try again.' });
    }
  } else if (req.method === 'GET') {
    // Get leave status logic
    try {
      const { id } = req.query;
      const result = await salesforceService.getRecord(id);
      if (result.success) {
        res.json({ success: true, record: result.record });
      } else {
        res.status(404).json({ error: 'Leave record not found' });
      }
    } catch (error) {
      console.error('Get Leave Status Error:', error);
      res.status(500).json({ error: 'Failed to retrieve leave status' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
