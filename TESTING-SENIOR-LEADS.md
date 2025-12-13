# 🧪 TESTING MODE - Senior Lead Auto-Approval

## What Changed (Temporary for Testing)

### ✅ Auto-Approval for Senior Leads
Leave requests from senior leads are now **automatically approved** without manager review.

### 📧 Email Notifications Skipped
Senior leads won't trigger approval emails to managers (for testing convenience).

---

## How It Works

### Who is Considered a "Senior Lead"?

Anyone whose **email** or **name** contains these keywords:
- `senior`
- `lead`
- `director`
- `manager`
- `cto`
- `ceo`
- `head`
- `vp`

### Examples:
✅ `senior.developer@winfomi.com` → Auto-approved
✅ `team.lead@winfomi.com` → Auto-approved  
✅ `john.director@winfomi.com` → Auto-approved
✅ Name: "Sarah Senior Engineer" → Auto-approved
❌ `john.doe@winfomi.com` → Normal approval flow

---

## Testing the Flow

### Test 1: Senior Lead Request (Should Auto-Approve)
```
User: annual leave on 20.12.2025 for vacation
Employee: Senior Developer
```

**Expected Result:**
```
✅ Leave request created!

📋 Summary:
• Request ID: LEAVE_123
• Employee: Senior Developer
• Type: ANNUAL
• Date: 2025-12-20
• Reason: vacation
• Status: ✅ Approved (Senior Lead - Auto-approved)

Your leave has been automatically approved. Enjoy your time off!
```

### Test 2: Regular Employee Request (Normal Flow)
```
User: annual leave on 20.12.2025 for vacation
Employee: John Doe
```

**Expected Result:**
```
✅ Leave request created!

📋 Summary:
• Request ID: LEAVE_124
• Employee: John Doe
• Type: ANNUAL
• Date: 2025-12-20
• Reason: vacation
• Status: Pending Approval

Your manager will review this request shortly.
```

---

## Configuration File

Edit `senior-lead-config.js` to:
- Add more emails to the whitelist
- Add/remove keywords
- Enable/disable this feature

```javascript
module.exports = {
  // Add your test emails here
  seniorLeads: [
    'senior@winfomi.com',
    'your.test.email@winfomi.com'  // ADD HERE
  ],
  
  // Toggle features
  skipEmailsForSeniorLeads: true,  // Set to false to send emails
  autoApproveSeniorLeads: true      // Set to false to disable auto-approval
};
```

---

## Console Output

When a senior lead submits a request, you'll see:
```
✅ Mock Leave Record Created (AUTO-APPROVED - Senior Lead): LEAVE_123
⏭️  Skipping email notification - Employee is Senior Lead (Testing Mode)
   Employee: Senior Developer (senior@winfomi.com)
```

---

## To Remove This (After Testing)

1. Delete `senior-lead-config.js`
2. Remove the `isSeniorLead()` checks from:
   - `src/services/salesforceService.ts`
   - `manager-notification-service.js`
3. Recompile: `npm run build`

---

## Quick Start Testing

1. **Start server:**
   ```bash
   node dist/app.js
   ```

2. **Open browser:**
   http://localhost:5000

3. **Test with senior lead name/email:**
   ```
   annual leave on 25.12.2025 for christmas
   ```
   (If your name/email contains "senior", "lead", etc., it will auto-approve)

4. **Check console** for confirmation messages

---

✨ **This is TEMPORARY for testing. Remove before production!**
