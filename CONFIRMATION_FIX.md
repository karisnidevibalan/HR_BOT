# Confirmation Flow Fix

## Problem
The chatbot was creating Salesforce records immediately upon detecting leave/WFH requests, without waiting for user confirmation. This meant that if a user said "no" or "cancel" after seeing the summary, the record was already created in Salesforce.

## Solution Overview
Implemented a two-phase flow:
1. **Phase 1 - Preview**: Extract details → Show summary → Ask for confirmation
2. **Phase 2 - Create**: User confirms → Create Salesforce record

## Changes Made

### 1. Enhanced Reason Extraction (`src/utils/entityExtractor.ts`)

**Problem**: Extracted reasons included redundant words like "casual leave tomorrow" instead of cleaning them.

**Fix**: Enhanced `extractReason()` and added new `cleanReason()` method to remove:
- Leave type keywords: casual, sick, annual, maternity, paternity
- Date references: tomorrow, today, yesterday, day after tomorrow
- Month names and numeric dates
- Common filler words: want, need, to, please, etc.
- Action words: apply, applying, request, requesting

**Example**:
```
Input: "I want to apply for casual leave tomorrow"
Before: reason = "casual leave tomorrow"
After: reason = "Personal" (or extracted actual reason if provided)
```

### 2. Added Confirmation Context (`src/utils/contextManager.ts`)

**New Fields**:
```typescript
interface SessionContext {
  // ... existing fields
  pendingConfirmation?: {
    type: 'leave' | 'wfh';
    details: any; // Leave or WFH details awaiting confirmation
  };
}
```

**New Methods**:
- `setPendingConfirmation(sessionId, type, details)` - Save details awaiting confirmation
- `getPendingConfirmation(sessionId)` - Retrieve pending details
- `isAwaitingConfirmation(sessionId)` - Check if confirmation is pending
- `clearPendingConfirmation(sessionId)` - Clear after confirmation or cancellation

### 3. Updated Chatbot Flow (Next Step)

The chatController needs to be updated to:

1. **When leave details are extracted**:
   ```typescript
   // OLD: Immediately create Salesforce record
   const result = await processLeaveRequest(details);
   
   // NEW: Save to context and ask for confirmation
   contextManager.setPendingConfirmation(sessionId, 'leave', details);
   response = `Preview:\n• Type: ${details.leaveType}\n....\nIs this correct? (yes/no)`;
   ```

2. **When user confirms (yes/correct/looks good)**:
   ```typescript
   if (contextManager.isAwaitingConfirmation(sessionId)) {
     const pending = contextManager.getPendingConfirmation(sessionId);
     const result = await processLeaveRequest(pending.details);
     contextManager.clearPendingConfirmation(sessionId);
     response = `✅ Leave request created! ID: ${result.id}`;
   }
   ```

3. **When user cancels (no/cancel)**:
   ```typescript
   if (contextManager.isAwaitingConfirmation(sessionId)) {
     contextManager.clearPendingConfirmation(sessionId);
     response = `Request cancelled. What would you like to do instead?`;
   }
   ```

## Implementation Status

✅ Enhanced reason extraction with comprehensive keyword filtering
✅ Added pendingConfirmation field to SessionContext
✅ Added confirmation management methods to ContextManager
⏳ Need to update chatController.ts to use confirmation flow (requires testing)

## Testing Recommendations

1. **Test Reason Extraction**:
   - Input: "casual leave tomorrow"
   - Expected: reason = "Personal" (not "casual leave tomorrow")

2. **Test Confirmation Flow**:
   - Input: "I want leave tomorrow"
   - Expected: Bot shows preview and asks "Is this correct?"
   - Input: "yes" → Create Salesforce record
   - Input: "no" → Cancel without creating record

3. **Test Cancellation**:
   - User should be able to say "no", "cancel", "not correct" after preview
   - No Salesforce record should be created
   - Context should be cleared

## Benefits

1. **No premature record creation**: Records only created after explicit confirmation
2. **Better user experience**: Users can review and cancel before commitment
3. **Cleaner reasons**: Removes redundant words that were already captured in other fields
4. **Proper conversation flow**: Ask → Preview → Confirm → Create

## Next Steps

1. Update `chatController.ts` to implement confirmation flow
2. Add tests for new confirmation flow
3. Test end-to-end with real Salesforce integration
4. Document new conversation patterns
