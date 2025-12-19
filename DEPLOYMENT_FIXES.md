# HR Agent Bot - Deployment Fixes & Guide

## Issues Found & Fixed

### 1. **Vercel Configuration Problem** ✅ FIXED

**Problem:**
- Your `vercel.json` was using `api/**/*.ts` pattern with per-file serverless functions
- Vercel tried to build files like `api/chat.ts` and `api/controllers/chatController.ts`
- The import paths in these files referenced `../../src/services/...` which didn't exist in the Vercel build context
- This caused TypeScript compilation errors: `Cannot find module '../../src/services/aiService'`

**Root Cause:**
- You have TWO entry points set up:
  - `src/app.ts` - Your main Express server (working, compiled to `dist/app.js`)
  - `api/*.ts` - Attempt at Vercel serverless functions (broken, conflicting configuration)

**Solution Applied:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/app.js",
      "use": "@vercel/node",
      "config": { "includeFiles": ["dist/**", "data/**"] }
    }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "dist/app.js" }
  ]
}
```

This tells Vercel to:
1. Use your compiled `dist/app.js` (your Express server) as the handler
2. Include all files in `dist/` and `data/` folders
3. Route ALL requests to `dist/app.js`

### 2. **API Files Are Now Unnecessary**

The following files in `api/` are no longer needed and can be deleted:
- `api/chat.ts`
- `api/index.ts`
- `api/test.ts`
- `api/wfhController.ts`
- `api/leaveController.ts`

Why? Because your Express server in `src/app.ts` already handles all routes. Vercel will run your entire Express app.

## Architecture After Fix

```
Vercel Request
       ↓
  dist/app.js (Express Server)
       ↓
  src/routes/ (Your route handlers)
       ↓
  src/controllers/ (chatController, leaveController, wfhController, etc.)
       ↓
  src/services/ (AiService, SalesforceService, DateParser, etc.)
       ↓
  Salesforce API / External Services
```

## What Your Frontend Should Call

Your React/Vite frontend in `hr-agent-bot/` should call:

```typescript
// Option 1: Relative URL (same domain)
const API_BASE = '/api';  // Or '/' depending on your routes

// Option 2: Absolute URL (deployed)
const API_BASE = 'https://your-vercel-domain.vercel.app';

// Then call:
await fetch(`${API_BASE}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage })
});
```

## Next Steps for Complete Deployment

### Step 1: Clean Up (Optional but Recommended)
Delete these unnecessary files since they cause build errors:
```bash
git rm api/chat.ts
git rm api/index.ts
git rm api/test.ts
git rm api/wfhController.ts
git rm api/leaveController.ts
git commit -m "Remove Vercel serverless wrapper functions - using Express server instead"
git push origin main
```

### Step 2: Verify Local Build
```bash
npm run build
# Check that dist/app.js was created and has reasonable size
ls -lh dist/app.js

# Test locally
npm start
# Visit http://localhost:3000 (or your port) and test the chat
```

### Step 3: Push to GitHub
```bash
git add .
git commit -m "HR Bot ready for Vercel deployment"
git push origin main
```

### Step 4: Vercel Automatically Deploys
- Vercel watches your `main` branch
- When you push, it will:
  1. Clone your repo
  2. Run `npm install`
  3. Run `npm run build` (builds TypeScript to `dist/`)
  4. Start your app using the command in `vercel.json`
  5. Make it live at `https://hr-bot-zeta.vercel.app`

### Step 5: Fix Frontend API Calls
In your React frontend (`hr-agent-bot/src/`), find where you call the API.

Update from:
```typescript
fetch('http://localhost:3000/api/chat', ...)  // ❌ Won't work on Vercel
```

To:
```typescript
const apiUrl = process.env.NODE_ENV === 'production'
  ? 'https://hr-bot-zeta.vercel.app'  // Your Vercel domain
  : 'http://localhost:3000';           // Local development

fetch(`${apiUrl}/api/chat`, ...)  // ✅ Works everywhere
```

### Step 6: Test Deployed Site
Once Vercel deployment completes:
1. Open your Vercel URL
2. Test the chat: "Apply leave on 25.12.2025 for Christmas"
3. Should see a response (not "Connection error")

## Troubleshooting Checklist

- [ ] Run `npm run build` locally - no TypeScript errors
- [ ] `dist/app.js` exists and isn't empty
- [ ] `vercel.json` points to `dist/app.js` (not `api/**`)
- [ ] Frontend API calls use correct domain (not localhost in production)
- [ ] Vercel deployment shows "Build Completed" with 0 errors
- [ ] Test API endpoint: visit `https://your-domain.vercel.app/health` (if you have that route)
- [ ] Check Vercel logs for runtime errors

## Summary

✅ **Fixed:** `vercel.json` now uses `dist/app.js` (your working Express server)
⚠️ **Next:** Delete the broken `api/` wrapper files (optional but clean)
⚠️ **Critical:** Update frontend to call correct API domain
✅ **Then:** Push to GitHub → Vercel auto-deploys → Live!

Your bot should now work on Vercel without the "Connection error" message.
