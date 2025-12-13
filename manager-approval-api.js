// Manager Approval API Endpoints
const express = require('express');
const { ManagerNotificationService } = require('./manager-notification-service');

const notificationService = new ManagerNotificationService();

// Manager approval endpoints
app.get('/manager/approve/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // Show approval page
    res.redirect(`/manager-approval.html?id=${requestId}&action=approve`);
  } catch (error) {
    res.status(500).json({ error: 'Approval page error' });
  }
});

app.get('/manager/reject/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // Show rejection page
    res.redirect(`/manager-approval.html?id=${requestId}&action=reject`);
  } catch (error) {
    res.status(500).json({ error: 'Rejection page error' });
  }
});

// Process approval
app.post('/api/manager/approve/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { managerComments, managerName } = req.body;
    
    // Find the request in mock database
    const requestIndex = mockDatabase.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Update the request
    mockDatabase[requestIndex] = {
      ...mockDatabase[requestIndex],
      status: 'Approved',
      managerComments: managerComments,
      managerName: managerName,
      approvedDate: new Date().toISOString(),
      managerApproval: true
    };
    
    // Send notification to employee
    await sendEmployeeNotification(mockDatabase[requestIndex], 'approved');
    
    console.log('✅ Leave request approved:', requestId);
    
    res.json({
      success: true,
      message: 'Leave request approved successfully',
      updatedRecord: mockDatabase[requestIndex]
    });
    
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Process rejection
app.post('/api/manager/reject/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { managerComments, managerName } = req.body;
    
    // Find the request in mock database
    const requestIndex = mockDatabase.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Update the request
    mockDatabase[requestIndex] = {
      ...mockDatabase[requestIndex],
      status: 'Rejected',
      managerComments: managerComments,
      managerName: managerName,
      rejectedDate: new Date().toISOString(),
      managerApproval: false
    };
    
    // Send notification to employee
    await sendEmployeeNotification(mockDatabase[requestIndex], 'rejected');
    
    console.log('❌ Leave request rejected:', requestId);
    
    res.json({
      success: true,
      message: 'Leave request rejected',
      updatedRecord: mockDatabase[requestIndex]
    });
    
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Employee notification function
async function sendEmployeeNotification(request, action) {
  const employeeEmail = `${request.employeeName.toLowerCase().replace(' ', '.')}@winfomi.com`;
  
  const emailContent = {
    from: 'hr-bot@winfomi.com',
    to: employeeEmail,
    subject: `📋 Leave Request ${action.toUpperCase()} - ${request.leaveType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: ${action === 'approved' ? '#4CAF50' : '#f44336'};">
          Leave Request ${action.toUpperCase()}
        </h2>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
          <p><strong>Leave Type:</strong> ${request.leaveType}</p>
          <p><strong>Dates:</strong> ${request.startDate} to ${request.endDate}</p>
          <p><strong>Status:</strong> ${request.status}</p>
          ${request.managerComments ? `<p><strong>Manager Comments:</strong> ${request.managerComments}</p>` : ''}
        </div>

        <p style="color: #666; margin-top: 20px;">
          ${action === 'approved' ? 
            '🎉 Your leave has been approved! Enjoy your time off.' : 
            '📝 Your leave request was not approved. Please contact your manager for more details.'
          }
        </p>
      </div>
    `
  };

  try {
    // In demo mode, just log the notification
    console.log('📧 Employee notification sent:', emailContent.subject);
    return { success: true };
  } catch (error) {
    console.error('Employee notification error:', error);
    return { success: false };
  }
}

// Manager dashboard
app.get('/manager/dashboard', (req, res) => {
  const pendingRequests = mockDatabase.filter(r => r.status === 'Pending Approval');
  
  res.json({
    success: true,
    pendingRequests: pendingRequests,
    totalRequests: mockDatabase.length,
    approvedRequests: mockDatabase.filter(r => r.status === 'Approved').length,
    rejectedRequests: mockDatabase.filter(r => r.status === 'Rejected').length
  });
});

module.exports = { notificationService };