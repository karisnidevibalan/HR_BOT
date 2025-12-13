# HR Bot Architecture - Visual Overview

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         EMPLOYEE LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  👤 Employee                                                      │
│     │                                                             │
│     ├─ Speaks: "I want leave on Dec 20"                         │
│     └─ Types via chat interface                                  │
│                         ↓                                         │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│                      BOT LAYER (Your Server)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🤖 HR Chatbot (demo-server.js)                                  │
│     │                                                             │
│     ├─ Speech Recognition (Web Speech API)                       │
│     ├─ Natural Language Processing                               │
│     ├─ Date Parsing & Validation                                 │
│     └─ Salesforce API Integration (jsforce)                      │
│                         ↓                                         │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│                    API INTEGRATION LAYER                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🔌 Salesforce REST API                                          │
│     │                                                             │
│     ├─ Authentication (Username + Password + Security Token)     │
│     ├─ Create Records                                            │
│     ├─ Query Records                                             │
│     └─ Update Records                                            │
│                         ↓                                         │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│                    SALESFORCE PLATFORM                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ☁️ Salesforce Cloud                                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📦 DATABASE LAYER                                          │ │
│  │                                                            │ │
│  │  Leave_Request__c Object (Custom Object)                  │ │
│  │  ├─ Id (Auto-generated)                                   │ │
│  │  ├─ Employee_Name__c                                      │ │
│  │  ├─ Leave_Type__c (Picklist)                             │ │
│  │  ├─ Start_Date__c                                         │ │
│  │  ├─ End_Date__c                                           │ │
│  │  ├─ Reason__c                                             │ │
│  │  ├─ Status__c (Pending/Approved/Rejected)                │ │
│  │  ├─ Request_Source__c (Chatbot/Portal/Manual)            │ │
│  │  ├─ Manager__c (Lookup to User)                          │ │
│  │  └─ Employee__c (Lookup to User)                         │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                         ↓                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ⚙️ AUTOMATION LAYER                                        │ │
│  │                                                            │ │
│  │  Auto-Launch Flow: "Leave Request Handler"               │ │
│  │                                                            │ │
│  │  When: New record created OR Status changes              │ │
│  │                                                            │ │
│  │  Actions:                                                 │ │
│  │  ├─ 1. Get Employee's Manager                            │ │
│  │  ├─ 2. Update Manager field                              │ │
│  │  ├─ 3. Send email to Manager                             │ │
│  │  ├─ 4. Create calendar event                             │ │
│  │  ├─ 5. Check leave balance                               │ │
│  │  └─ 6. Notify employee on status change                  │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                         ↓                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👁️ UI LAYER                                                │ │
│  │                                                            │ │
│  │  Page Layouts:                                            │ │
│  │  ├─ Manager Layout (for approvals)                       │ │
│  │  ├─ HR Admin Layout (detailed view)                      │ │
│  │  └─ Employee Layout (read-only status)                   │ │
│  │                                                            │ │
│  │  Record Pages: Visual display of leave requests          │ │
│  │  List Views: Filtered views (My Requests, Pending, etc.) │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                         ↓                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📊 REPORTING LAYER                                         │ │
│  │                                                            │ │
│  │  Reports:                                                 │ │
│  │  ├─ Pending Approvals                                     │ │
│  │  ├─ Approved/Rejected Requests                            │ │
│  │  ├─ Leave by Department                                   │ │
│  │  └─ Approval Time Metrics                                 │ │
│  │                                                            │ │
│  │  Dashboards: Visual charts and metrics                    │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│                      MANAGER LAYER                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  👔 Manager Access Points:                                        │
│                                                                   │
│  1️⃣ Email Notification                                           │
│     ├─ Receives: "New leave request from John Doe"              │
│     └─ Contains: Approval link                                   │
│                                                                   │
│  2️⃣ Web Dashboard                                                │
│     ├─ URL: http://localhost:5000/manager/dashboard             │
│     └─ Shows: All pending requests with quick actions           │
│                                                                   │
│  3️⃣ Salesforce UI                                                │
│     ├─ Login to Salesforce                                       │
│     ├─ Navigate to Leave Requests tab                            │
│     └─ Approve/Reject from record page                           │
│                                                                   │
│  4️⃣ Salesforce Mobile App                                        │
│     ├─ Get push notification                                     │
│     └─ Approve on-the-go                                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Example

### Scenario: Employee requests leave for Dec 20

```
STEP 1: Employee Interaction
┌─────────────────────────┐
│ Employee speaks/types   │
│ "I want leave on Dec 20"│
└──────────┬──────────────┘
           ↓
STEP 2: Bot Processing
┌─────────────────────────┐
│ Bot parses message      │
│ - Detects: leave intent │
│ - Extracts: Dec 20      │
│ - Asks: reason?         │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ Employee: "vacation"    │
└──────────┬──────────────┘
           ↓
STEP 3: API Call to Salesforce
┌─────────────────────────────────────┐
│ Bot calls Salesforce API:           │
│                                     │
│ salesforceService.createLeaveRecord │
│ ({                                  │
│   Employee_Name__c: "John Doe",     │
│   Leave_Type__c: "Casual Leave",    │
│   Start_Date__c: "2025-12-20",      │
│   End_Date__c: "2025-12-20",        │
│   Reason__c: "vacation",            │
│   Status__c: "Pending",             │
│   Request_Source__c: "Chatbot"      │
│ })                                  │
└──────────┬──────────────────────────┘
           ↓
STEP 4: Salesforce Creates Record
┌─────────────────────────────────────┐
│ New Leave_Request__c record:        │
│ ID: a2AcZ000001wwW8UAI              │
│ Status: Pending                     │
│ Created: 2025-12-03 10:30 AM        │
└──────────┬──────────────────────────┘
           ↓
STEP 5: Auto-Launch Flow Triggers
┌─────────────────────────────────────┐
│ Flow detects new record             │
│                                     │
│ Action 1: Get Manager               │
│ - Query: John's manager from        │
│   User.ManagerId                    │
│ - Found: Jane Smith                 │
│                                     │
│ Action 2: Update Record             │
│ - Set Manager__c = Jane Smith       │
│                                     │
│ Action 3: Send Email                │
│ - To: jane.smith@company.com        │
│ - Subject: "New Leave Request"      │
│ - Body: Details + approval link     │
│                                     │
│ Action 4: Create Calendar Event     │
│ - Add to company calendar           │
└──────────┬──────────────────────────┘
           ↓
STEP 6: Manager Notification
┌─────────────────────────────────────┐
│ 📧 Email to Jane:                   │
│                                     │
│ Subject: New Leave Request          │
│                                     │
│ John Doe has requested leave:       │
│ - Date: December 20, 2025          │
│ - Type: Casual Leave               │
│ - Reason: vacation                 │
│                                     │
│ [Approve] [Reject] [View Details]  │
└──────────┬──────────────────────────┘
           ↓
STEP 7: Manager Action
┌─────────────────────────────────────┐
│ Jane clicks [Approve]               │
│                                     │
│ Manager Dashboard sends API call:   │
│ POST /api/manager/approve/          │
│      a2AcZ000001wwW8UAI             │
└──────────┬──────────────────────────┘
           ↓
STEP 8: Update Salesforce
┌─────────────────────────────────────┐
│ Bot calls Salesforce API:           │
│                                     │
│ salesforceService.updateRecord(     │
│   "a2AcZ000001wwW8UAI",             │
│   { Status__c: "Approved" }         │
│ )                                   │
└──────────┬──────────────────────────┘
           ↓
STEP 9: Flow Triggers Again (on update)
┌─────────────────────────────────────┐
│ Flow detects status change          │
│                                     │
│ Action 1: Send Approval Email       │
│ - To: john.doe@company.com          │
│ - Subject: "Leave Approved!"        │
│                                     │
│ Action 2: Update Calendar           │
│ - Mark as "Approved Leave"          │
│                                     │
│ Action 3: Deduct Leave Balance      │
│ - Current balance: 10 days          │
│ - After: 9 days                     │
└──────────┬──────────────────────────┘
           ↓
STEP 10: Employee Confirmation
┌─────────────────────────────────────┐
│ 📧 John receives email:             │
│                                     │
│ ✅ Your leave is approved!          │
│                                     │
│ Details:                            │
│ - Date: December 20, 2025          │
│ - Approved by: Jane Smith           │
│ - Remaining balance: 9 days         │
└─────────────────────────────────────┘
```

---

## 🎯 Why Each Component Exists

### Custom Object (Leave_Request__c)
**Problem it solves:**
- Where do we store leave request data?
- How do we track status changes?
- How do we link requests to employees and managers?

**Without it:**
You'd need to set up MySQL, write SQL schemas, handle migrations, backups, security.

**With it:**
Salesforce handles all infrastructure. Just define fields via UI.

---

### Auto-Launch Flow
**Problem it solves:**
- Who should be notified?
- When should emails be sent?
- How do we enforce business rules?
- Who should approve what?

**Without it:**
You'd need to write code for:
- Email sending logic
- Manager lookup logic
- Notification triggers
- Business rule validation

**With it:**
Visual drag-and-drop automation. No coding needed.

---

### Page Layouts
**Problem it solves:**
- Different users need to see different fields
- Managers need action buttons
- Employees should have read-only view
- HR needs all details

**Without it:**
You'd build separate admin panels for each role.

**With it:**
Configure different views per profile. Salesforce handles the UI.

---

### API Integration (jsforce)
**Problem it solves:**
- How does chatbot talk to Salesforce?
- How do we create/read/update records?
- How do we handle authentication?

**Without it:**
Manual data entry in Salesforce.

**With it:**
Seamless integration. Bot creates records automatically.

---

## 🚀 The Power of This Architecture

### Traditional Approach (What you'd need to build):
```
✗ Database setup (MySQL/PostgreSQL)
✗ ORM/Database migrations
✗ Admin panel UI
✗ User authentication system
✗ Role-based access control
✗ Email server configuration
✗ Email templates
✗ Notification service
✗ Reporting engine
✗ Dashboard UI
✗ Mobile app
✗ Backup system
✗ Security/encryption
✗ Audit logging
✗ Calendar integration
✗ Workflow engine

Total: 15+ systems to build and maintain
```

### Salesforce Approach (What's included):
```
✓ Database (Custom Objects)
✓ Migrations (Automatic)
✓ Admin UI (Page Layouts)
✓ Authentication (Built-in)
✓ Permissions (Profiles)
✓ Email (Automated)
✓ Templates (Email Templates)
✓ Notifications (Flows)
✓ Reports (Report Builder)
✓ Dashboards (Dashboard Builder)
✓ Mobile App (Salesforce Mobile)
✓ Backups (Automatic)
✓ Security (Enterprise-grade)
✓ Audit Trail (Field History)
✓ Integrations (AppExchange)
✓ Workflows (Flows)

Total: Everything included out-of-the-box ✨
```

---

## 📖 Quick Reference

### When Record is Created (Insert):
```
Trigger → Auto-Launch Flow
  ↓
Actions:
1. Look up manager
2. Send notification
3. Create calendar event
4. Validate rules
```

### When Record is Updated:
```
Trigger → Auto-Launch Flow (if Status changed)
  ↓
Actions:
1. Send approval/rejection email
2. Update calendar
3. Adjust leave balance
4. Notify stakeholders
```

### When Manager Approves:
```
Manager Dashboard
  ↓
API Call: POST /api/manager/approve/{id}
  ↓
Update Salesforce: Status__c = "Approved"
  ↓
Flow Triggers
  ↓
Employee gets email ✅
```

---

This architecture gives you an **enterprise-grade HR system** with minimal coding! 🎉
