// Manager Notification System - Demo Implementation
const nodemailer = require('nodemailer');

class ManagerNotificationService {
  constructor() {
    // Email configuration for demo
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NOTIFICATION_EMAIL,
        pass: process.env.NOTIFICATION_PASSWORD
      }
    });
  }

  async sendLeaveNotification(leaveRequest, managerEmail) {
    // TEMPORARY: Disable all email notifications for testing
    console.log('⏭️  EMAIL DISABLED FOR TESTING - Notification skipped');
    console.log(`   Would send to: ${managerEmail}`);
    console.log(`   Employee: ${leaveRequest.employeeName}`);
    console.log(`   Leave Type: ${leaveRequest.leaveType}`);
    console.log(`   Dates: ${leaveRequest.startDate} to ${leaveRequest.endDate}`);
    return { success: true, skipped: true, reason: 'Testing Mode - Emails Disabled' };
    
    /* ORIGINAL CODE (uncomment to enable emails):
    const emailContent = {
      from: 'hr-bot@winfomi.com',
      to: managerEmail,
      subject: `🔔 Leave Request - ${leaveRequest.employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #4CAF50;">New Leave Request</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
            <p><strong>Employee:</strong> ${leaveRequest.employeeName}</p>
            <p><strong>Leave Type:</strong> ${leaveRequest.leaveType}</p>
            <p><strong>Start Date:</strong> ${leaveRequest.startDate}</p>
            <p><strong>End Date:</strong> ${leaveRequest.endDate}</p>
            <p><strong>Reason:</strong> ${leaveRequest.reason}</p>
            <p><strong>Duration:</strong> ${this.calculateDays(leaveRequest.startDate, leaveRequest.endDate)} days</p>
          </div>

          <div style="margin: 20px 0;">
            <h3>Action Required:</h3>
            <a href="http://localhost:5000/manager/approve/${leaveRequest.id}" 
               style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
               ✅ APPROVE
            </a>
            <a href="http://localhost:5000/manager/reject/${leaveRequest.id}" 
               style="background: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
               ❌ REJECT
            </a>
          </div>

          <p style="color: #666; font-size: 12px;">
            This is an automated notification from Winfomi HR Agent Bot.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(emailContent);
      console.log('📧 Manager notification sent successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Email notification failed:', error);
      return { success: false, error: error.message };
    }
    */
  }

  calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

module.exports = { ManagerNotificationService };