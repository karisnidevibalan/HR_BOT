# HR Agent Bot - Testing Guide

## ✅ What Was Fixed

### 1. **Enhanced Date Parsing** 
The bot now understands multiple date formats:
- ✅ `19.12.2025` → December 19, 2025
- ✅ `19-12` → December 19, 2025 (current year)
- ✅ `25.12.2025` → December 25, 2025
- ✅ `31-12-2025` → December 31, 2025
- ✅ `15/03/2026` → March 15, 2026
- ✅ `25 december` → December 25, 2025
- ✅ `december 25` → December 25, 2025
- ✅ `tomorrow`, `today` → Relative dates

### 2. **Edit Functionality**
Users can now edit their requests after submission:
- Say "edit", "change", "correct", or "no" after a request is created
- The bot shows current details and asks for complete updated information
- All fields can be edited (date, reason, type, etc.)

### 3. **Session Management**
- Conversations are tracked per session
- Use `x-session-id` header for maintaining context
- Last request is saved for editing

## 🧪 How to Test

### Manual Testing via Browser

1. **Start the server:**
   ```bash
   node dist/app.js
   ```

2. **Open browser:**
   Navigate to `http://localhost:5000`

3. **Test Date Formats:**

   Try these messages:
   ```
   wfh on 19.12.2025 for doctor appointment
   work from home on 25-12 for christmas
   annual leave on 1.1.2026 for new year
   wfh tomorrow for personal work
   ```

4. **Test Edit Functionality:**

   Step 1 - Create a request:
   ```
   wfh on 20.12.2025 for testing
   ```
   
   Step 2 - Edit it:
   ```
   edit
   ```
   
   Step 3 - Provide new details:
   ```
   wfh on 22.12.2025 for family event
   ```

### Test Scenarios

#### Scenario 1: WFH Request with DD.MM.YYYY
**Input:** `wfh on 19.12.2025 for doctor appointment`

**Expected Response:**
```
✅ Work From Home request submitted successfully!

📋 Summary:
• Date: 2025-12-19
• Reason: doctor appointment
• Employee: You
• Status: Approved (Auto-approved)

✏️ Need to make changes? Just say "edit" or "change date" to update any details.
```

#### Scenario 2: Leave Request with Month Name
**Input:** `annual leave on 25 december for christmas`

**Expected Response:**
```
✅ Leave request created!

📋 Summary:
• Request ID: a2AcZ...
• Employee: You
• Type: ANNUAL
• Date: 2025-12-25
• Reason: christmas
• Status: Pending Approval

✏️ Need to make changes? Just say "edit" or "change reason" to update any details.
```

#### Scenario 3: Edit Request
**Step 1 Input:** `wfh on 20.12.2025 for testing`
**Step 2 Input:** `edit`

**Expected Response:**
```
✏️ Got it! Let's correct your wfh request.

**Current Details:**
• Date: 2025-12-20
• Reason: testing

Please provide the complete updated information. For example:
"WFH on 20.12.2025 for personal work"
```

**Step 3 Input:** `wfh on 22.12.2025 for urgent work`
**Expected:** New request created with updated details

## 🐛 Known Issues

1. **YYYY-MM-DD format** - Currently not parsing correctly in some edge cases
2. **Month name dates** - May have timezone offset issues (shows 1 day earlier)

## 📝 Implementation Details

### Files Modified:
- `src/services/aiService.ts` - Improved intent detection
- `src/controllers/chatController.ts` - Added date parsing and edit functionality
- Added session-based conversation context

### Key Features:
- **11 date format patterns** supported
- **Conversation context** stored in memory (use Redis for production)
- **Edit mode** with complete field updates
- **Session tracking** via x-session-id header

## 🚀 Next Steps

1. **Fix remaining date format issues** (YYYY-MM-DD, timezone for month names)
2. **Add Redis** for production-ready session storage
3. **Add field-specific editing** ("change only date", "change only reason")
4. **Add confirmation dialogs** before final submission
5. **Add delete/cancel** functionality for submitted requests

## 📞 Support

If you encounter issues:
1. Check that `node dist/app.js` is running
2. Verify Salesforce credentials are set in `.env`
3. Check console for error messages
4. Test with simple queries first: "What's the leave policy?"

---

✨ **The bot is now ready for testing!** Open http://localhost:5000 and try the examples above.
