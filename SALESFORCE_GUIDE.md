# Salesforce Integration Guide for HR Bot

## Overview
This HR Bot uses Salesforce as the **backend database and workflow engine** to store, manage, and process employee leave requests. Instead of using a traditional database like MySQL or MongoDB, all data lives in Salesforce, giving you powerful CRM capabilities, reporting, and automation.

---

## 🎯 Why Use Salesforce?

### Benefits:
1. **No Database Maintenance** - Salesforce handles all data storage, backups, security
2. **Built-in Reporting** - Create dashboards and reports without coding
3. **Workflow Automation** - Automatic email notifications, escalations, approvals
4. **Mobile Access** - Managers can approve requests from Salesforce mobile app
5. **Security & Compliance** - Enterprise-grade security, audit trails, role-based access
6. **Integration Hub** - Connect with email, Slack, Microsoft Teams, payroll systems

---

## 📦 Custom Objects - The Data Structure

### What is a Custom Object?
Think of it like a **database table** in Salesforce. Each custom object stores specific types of records.

### Leave_Request__c Object
This is the main custom object for storing all leave requests.

#### Purpose:
- Store employee leave applications submitted through the chatbot
- Track status (Pending → Approved/Rejected)
- Maintain audit trail of who requested what and when
- Enable manager review and approval workflow

#### Fields (Columns) in Leave_Request__c:

| Field Name | Type | Purpose | Example |
|------------|------|---------|---------|
| **Employee_Name__c** | Text | Name of employee requesting leave | "John Doe" |
| **Leave_Type__c** | Picklist | Type of leave | "Sick Leave", "Casual Leave", "Work From Home" |
| **Start_Date__c** | Date | Leave start date | 2025-12-15 |
| **End_Date__c** | Date | Leave end date | 2025-12-17 |
| **Reason__c** | Long Text Area | Why they need leave | "Attending family wedding" |
| **Status__c** | Picklist | Current approval status | "Pending", "Approved", "Rejected" |
| **Request_Source__c** | Picklist | Where request came from | "Chatbot", "Portal", "Manual" |
| **Employee__c** | Lookup | Link to Employee record | Reference to User object |
| **Manager__c** | Lookup | Assigned manager for approval | Reference to User object |

#### How the Bot Uses It:
```javascript
// When user says "I want leave on Dec 15 for vacation"
// Bot creates a record in Salesforce:
{
  Employee_Name__c: "You",
  Leave_Type__c: "Casual Leave",
  Start_Date__c: "2025-12-15",
  End_Date__c: "2025-12-15",
  Reason__c: "vacation",
  Status__c: "Pending",
  Request_Source__c: "Chatbot"
}
```

---

## 🔄 Auto-Launch Flow - Automation Engine

### What is an Auto-Launch Flow?
An **Auto-Launch Flow** is Salesforce's visual automation tool that runs **automatically** when certain conditions are met (like when a new leave request is created).

### Purpose of the Flow:

#### 1. **Automatic Manager Assignment**
```
When: New Leave Request is created
Action: Find the employee's manager and assign them
Result: Manager__c field is automatically populated
```

#### 2. **Email Notifications**
```
Trigger: Leave request created
Action: Send email to manager
Email contains:
  - Employee name
  - Leave dates
  - Reason
  - Link to approval page: http://localhost:5000/manager-approval.html?id=RECORD_ID
```

#### 3. **Approval Notifications**
```
When: Manager approves/rejects
Action: Send email to employee
Email contains: Decision and manager comments
```

#### 4. **Business Rules Enforcement**
```
Examples:
- Check if employee has enough leave balance
- Ensure no overlapping leave dates
- Auto-approve if < 1 day
- Escalate if pending > 3 days
```

#### 5. **Integration Triggers**
```
After approval:
- Update calendar system
- Notify team members
- Update HR dashboard
- Sync with payroll
```

### Flow Example Structure:
```
Start
  ↓
New Leave Request Created?
  ↓
Get Employee's Manager from User record
  ↓
Update Manager__c field
  ↓
Send Email to Manager
  - Subject: "New Leave Request from [Employee]"
  - Body: Details + Approval Link
  ↓
End
```

---

## 📱 Page Layouts - The User Interface

### What is a Page Layout?
A **Page Layout** defines what fields Salesforce users see when viewing or editing a record. It's like designing a form.

### Purpose:

#### Manager Layout
**What managers see when reviewing leave requests:**
```
┌─────────────────────────────────────┐
│  Leave Request Details              │
├─────────────────────────────────────┤
│ Employee Name: [John Doe          ] │
│ Leave Type:    [Sick Leave        ] │
│ Start Date:    [2025-12-15        ] │
│ End Date:      [2025-12-17        ] │
│ Status:        [Pending           ] │
│ Reason:        [Family emergency  ] │
│                                     │
│ [Approve]  [Reject]  [Request Info]│
└─────────────────────────────────────┘
```

#### HR Admin Layout
**What HR sees (more detailed view):**
```
┌─────────────────────────────────────┐
│ Employee: [John Doe] Manager: [Jane]│
│ Leave Type: Sick Leave              │
│ Dates: Dec 15 - Dec 17 (3 days)    │
│ Leave Balance Before: 10 days       │
│ Leave Balance After: 7 days         │
│ Submitted: 2025-12-10 10:30 AM      │
│ Request Source: Chatbot             │
│ Status: Approved by Jane Smith      │
│ Approved On: 2025-12-10 2:15 PM     │
└─────────────────────────────────────┘
```

#### Employee Self-Service Layout
**What employees see when checking their requests:**
```
┌─────────────────────────────────────┐
│ My Leave Request                    │
├─────────────────────────────────────┤
│ Type: Casual Leave                  │
│ Dates: Dec 20 - Dec 22             │
│ Status: ✅ Approved                 │
│ Manager Note: "Approved. Enjoy!"    │
└─────────────────────────────────────┘
```

---

## 🔐 Profiles & Permissions

### Purpose: Control Who Can Do What

#### 1. **Employee Profile**
```
Permissions:
- Can CREATE leave requests (via bot)
- Can READ their own requests
- CANNOT approve/reject
- CANNOT see other employees' requests
```

#### 2. **Manager Profile**
```
Permissions:
- Can CREATE their own requests
- Can READ all their team's requests
- Can EDIT Status__c field (Approve/Reject)
- Can add Manager_Comments__c
```

#### 3. **HR Admin Profile**
```
Permissions:
- Can READ/EDIT all leave requests
- Can generate reports
- Can adjust leave balances
- Can configure system settings
```

---

## 📊 Reports & Dashboards

### Purpose: Visibility and Analytics

#### Reports You Can Create:

1. **Pending Approvals Report**
   - Shows all leave requests waiting for manager approval
   - Managers see this daily

2. **Leave Calendar**
   - Visual calendar showing who's out when
   - Helps prevent team coverage gaps

3. **Leave Balance Report**
   - Shows remaining leave days per employee
   - HR uses for year-end planning

4. **Approval Time Report**
   - How long managers take to approve
   - Identify bottlenecks

5. **Leave Patterns**
   - Which months have most requests
   - Help with resource planning

---

## 🔗 How Everything Works Together

### Complete Flow Example:

```
┌─────────────────────────────────────────────────────────┐
│ 1. EMPLOYEE INTERACTS WITH BOT                          │
└─────────────────────────────────────────────────────────┘
   Employee: "I want leave on December 20th"
   Bot: "What's the reason?"
   Employee: "Family vacation"
   Bot: Creates record via Salesforce API
              ↓
┌─────────────────────────────────────────────────────────┐
│ 2. SALESFORCE RECEIVES REQUEST                          │
└─────────────────────────────────────────────────────────┘
   New Leave_Request__c record created:
   - Employee_Name__c: "John Doe"
   - Status__c: "Pending"
   - Request_Source__c: "Chatbot"
              ↓
┌─────────────────────────────────────────────────────────┐
│ 3. AUTO-LAUNCH FLOW TRIGGERS                            │
└─────────────────────────────────────────────────────────┘
   Flow automatically:
   - Looks up John's manager (Jane Smith)
   - Updates Manager__c field
   - Sends email to Jane with approval link
   - Creates calendar hold
              ↓
┌─────────────────────────────────────────────────────────┐
│ 4. MANAGER REVIEWS                                       │
└─────────────────────────────────────────────────────────┘
   Jane receives email:
   - Opens http://localhost:5000/manager/dashboard
   - Sees John's request with all details
   - Clicks "Approve"
              ↓
┌─────────────────────────────────────────────────────────┐
│ 5. BOT UPDATES SALESFORCE                                │
└─────────────────────────────────────────────────────────┘
   Bot calls Salesforce API:
   - Updates Status__c to "Approved"
              ↓
┌─────────────────────────────────────────────────────────┐
│ 6. FLOW TRIGGERS AGAIN (on update)                      │
└─────────────────────────────────────────────────────────┘
   Flow automatically:
   - Sends approval email to John
   - Updates team calendar
   - Deducts from leave balance
   - Notifies HR system
              ↓
┌─────────────────────────────────────────────────────────┐
│ 7. EMPLOYEE GETS CONFIRMATION                            │
└─────────────────────────────────────────────────────────┘
   John receives email: "Your leave is approved!"
   John can also check status in bot anytime
```

---

## 🛠️ Setup Requirements in Salesforce

### Step 1: Create Custom Object
```
Setup → Object Manager → Create → Custom Object
Name: Leave Request
API Name: Leave_Request__c
```

### Step 2: Add Fields
For each field above, go to:
```
Object Manager → Leave_Request__c → Fields & Relationships → New
```

### Step 3: Create Picklist Values
For **Leave_Type__c**:
- Casual Leave
- Sick Leave
- Work From Home

For **Status__c**:
- Pending
- Approved
- Rejected

For **Request_Source__c**:
- Chatbot
- Portal
- Manual

### Step 4: Create Auto-Launch Flow
```
Setup → Flows → New Flow → Auto-Launch Flow

Add these elements:
1. Start: Trigger when Leave_Request__c is created
2. Get Records: Find employee's manager
3. Update Records: Set Manager__c field
4. Send Email: Notify manager
5. End
```

### Step 5: Create Page Layouts
```
Setup → Object Manager → Leave_Request__c → Page Layouts
- Manager Layout (simple view)
- HR Admin Layout (detailed view)
- Employee Layout (read-only)
```

### Step 6: Set Up Security
```
Setup → Profiles
Configure permissions for Employee, Manager, HR Admin profiles
```

---

## 🎓 Key Concepts Summary

| Component | Purpose | Real-World Analogy |
|-----------|---------|-------------------|
| **Custom Object** | Store leave data | Database table |
| **Fields** | Individual data points | Table columns |
| **Records** | Individual leave requests | Table rows |
| **Auto-Launch Flow** | Automation rules | If-then recipes |
| **Page Layout** | Define what users see | Form design |
| **Profiles** | Control permissions | User roles/access levels |
| **API Integration** | Bot connects to Salesforce | Database connection |
| **Reports** | Analyze data | Excel pivot tables |
| **Dashboards** | Visual summaries | Management dashboard |

---

## 💡 Why This Architecture?

### Traditional Approach:
```
Bot → MySQL Database → Custom Admin Panel → Email Server
     (You manage)    (You build)         (You configure)
```

### Salesforce Approach:
```
Bot → Salesforce API → Everything Built-In ✨
     (Salesforce manages infrastructure)
     (Pre-built admin UI)
     (Email/notifications included)
     (Reports/dashboards ready)
     (Mobile apps provided)
```

### Advantages:
✅ **No database setup** - Salesforce handles it  
✅ **No admin panel coding** - Use Salesforce UI  
✅ **No email server** - Built-in email  
✅ **Automatic backups** - Salesforce responsibility  
✅ **Enterprise security** - Bank-level encryption  
✅ **Scalability** - Handles millions of records  
✅ **Mobile ready** - Salesforce mobile app  
✅ **Audit trails** - Track every change  

---

## 🔍 How to View Your Data

### In Salesforce:
1. Log into Salesforce
2. App Launcher (9 dots) → Search "Leave Requests"
3. Click "Leave Requests" tab
4. See all records in list view
5. Click any record to see details

### Via Bot:
Employee asks: "What's my leave status?"
Bot queries Salesforce and shows current status

### Via Manager Dashboard:
http://localhost:5000/manager/dashboard
Shows all pending requests from Salesforce

---

## 📚 Next Steps

### To Enhance the System:

1. **Add Leave Balance Tracking**
   - Create Leave_Balance__c object
   - Deduct days when approved
   - Show remaining balance in bot

2. **Team Calendar Integration**
   - Sync with Google Calendar
   - Show team availability
   - Prevent overlapping leaves

3. **Approval Hierarchy**
   - 1-2 days: Auto-approve
   - 3-5 days: Manager approval
   - 6+ days: HR + Manager approval

4. **Advanced Reporting**
   - Leave trends by month
   - Department utilization
   - Approval time metrics

5. **Mobile Notifications**
   - Push notifications via Salesforce Mobile
   - SMS alerts for urgent approvals

---

## ❓ Common Questions

**Q: Why not just use a database like MySQL?**  
A: Salesforce provides database + UI + automation + reporting + mobile + security all in one. No need to build these separately.

**Q: Does this cost money?**  
A: Salesforce has paid licenses, but you get enterprise features. For small teams, there are affordable options or use Developer Edition (free for development).

**Q: Can I use this without Salesforce?**  
A: Yes! The bot has a mock database fallback. But you lose automation, reporting, and the admin UI.

**Q: What if Salesforce is down?**  
A: The bot automatically falls back to the local mock database (in-memory storage). This ensures the bot keeps working.

**Q: How do I debug issues?**  
A: 
- Check `demo-server.js` console for API call logs
- Salesforce → Setup → Debug Logs
- Check Flow execution history
- Use `test-salesforce.js` to test connection

---

## 🎉 You're All Set!

You now understand:
- ✅ Why Salesforce is used (Enterprise backend platform)
- ✅ Custom objects purpose (Data storage structure)
- ✅ Auto-Launch Flow purpose (Automation & notifications)
- ✅ Page Layouts purpose (User interface customization)
- ✅ How everything connects (End-to-end workflow)

Your HR Bot is a **modern, enterprise-grade system** powered by Salesforce! 🚀
WANT TO DO:
Option 2: Set Up Manager Field (Better for Production)
If you want dynamic manager assignment:

Step 1: Add Manager__c field to Leave_Request__c
Setup → Object Manager → Leave_Request__c
Fields & Relationships → New
Data Type: Lookup Relationship
Related To: User
Field Label: Manager
Field Name: Manager__c
Save
Step 2: Update Chatbot to Populate Manager
Update your Salesforce integration to include manager:

Step 3: Keep Your Current Selection
Then your current selection "Automatically assign using Manager" will work!

My Recommendation for NOW:
Since you're in Step 3 of 3 and testing:

Click "Previous" button
When you get back to this step, choose: "Automatically assign to approver(s)"
Select "Winfomi Developer" (or whoever should approve)
Check ☑️ "The approver's delegate may also approve this request" (allows backup approvers)
Click "Save"
This way your approval process will work immediately for testing!

Later, when you go to production, you can:

Add the Manager__c field
Update the chatbot
Edit the approval process to use the Manager field
Should I help you complete Option 1 (quick test setup) or Option 2 (production-ready with Manager field)?

Claude Sonnet 4.5 • 1x