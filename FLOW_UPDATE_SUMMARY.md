# Leave Request Flow Update

## Summary of Changes

The leave/WFH request flow has been updated to match your requirements:

### New Flow

1. **Initial Request** → User applies for leave
   - System extracts details (type, date, reason)
   - Shows confirmation summary with 3 options:
     - ✅ Confirm
     - ❌ Cancel
     - ✏️ Edit

2. **Before Salesforce Creation** → Nothing is stored yet
   - Record is NOT created in Salesforce
   - User can freely edit or cancel

3. **User Actions:**

   **A. If user confirms ("Yes"/"Confirm"):**
   - Creates record in Salesforce
   - Shows success message with Record ID
   - Request is now submitted

   **B. If user cancels ("No"/"Cancel"):**
   - Clears the request
   - No record created in Salesforce
   - Shows cancellation message

   **C. If user edits ("Edit"):**
   - If they provide new complete details: Updates and shows confirmation again
   - If they just say "edit": Asks for complete new information
   - Shows updated summary with Confirm/Cancel/Edit options
   - Still no Salesforce record created

### Example Conversation Flow

```
User: apply leave on 19.12.2025 for marriage

Bot: 📋 **Please confirm your leave request:**

• **Type**: ANNUAL
• **Date**: December 19, 2025
• **Reason**: marriage

Is this correct?
• Reply "Yes" or "Confirm" to submit
• Reply "No" or "Cancel" to cancel
• Reply "Edit" to make changes

User: Edit

Bot: ✏️ Got it! Let's update your leave request.

**Current Details:**
• Type: ANNUAL
• Date: December 19, 2025
• Reason: marriage

**You can update any of these details:**
• Change the type (Annual, Sick, Casual)
• Change the date
• Change the reason

Please provide the complete NEW information. For example:
"Casual leave on 20.12.2025 for family event"

User: Casual leave on 20.12.2025 for family event

Bot: 📋 **Please confirm your UPDATED leave request:**

• **Type**: CASUAL
• **Date**: December 20, 2025
• **Reason**: family event

Is this correct?
• Reply "Yes" or "Confirm" to submit
• Reply "No" or "Cancel" to cancel
• Reply "Edit" to make changes

User: Yes

Bot: ✅ Leave request created successfully!

📋 Summary:
• Request ID: a2AcZ0000024dHoUAI
• Employee: You
• Type: CASUAL
• Date: December 20, 2025
• Reason: family event
• Status: Pending Approval

Your manager will review this request shortly.
```

## Key Changes Made

### 1. Updated Confirmation Handler
- Added edit functionality during confirmation phase
- Edit requests are handled BEFORE Salesforce creation
- Shows Confirm/Cancel/Edit options in all confirmation messages

### 2. Modified Leave Request Flow
- Initial request shows confirmation immediately
- No Salesforce record created until confirmation
- Edit option available at confirmation stage

### 3. Updated WFH Request Flow
- Same pattern as leave requests
- Confirmation before Salesforce creation
- Edit support during confirmation

### 4. Post-Creation Edit Handling
- If user tries to edit after Salesforce creation
- System informs them the record is already submitted
- Suggests contacting manager or creating a new request

## Files Modified

- `src/controllers/chatController.ts` - Main flow logic updated

## Testing Recommendations

1. **Test basic flow:**
   - Apply for leave → Confirm → Check if created in Salesforce

2. **Test cancel flow:**
   - Apply for leave → Cancel → Verify nothing in Salesforce

3. **Test edit flow:**
   - Apply for leave → Edit → Update details → Confirm → Check Salesforce

4. **Test edit with partial details:**
   - Apply for leave → Edit (just say "edit") → Provide new complete details → Confirm

5. **Test post-creation edit:**
   - Apply for leave → Confirm → Try to edit → Should inform record already submitted
