# Deploy to Render.com - Step by Step Guide

## Prerequisites
✅ GitHub account
✅ Render.com account (free - sign up at https://render.com)
✅ Your environment variables ready (GROQ_API_KEY, Salesforce credentials)

## Step 1: Prepare Your Repository

### 1.1 Create .gitignore (if not exists)
Make sure these are ignored:
```
node_modules/
dist/
.env
*.log
.DS_Store
```

### 1.2 Commit all changes
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 2: Deploy on Render

### 2.1 Sign Up/Login
1. Go to https://render.com
2. Click "Get Started" or "Sign In"
3. Sign up with GitHub (recommended)

### 2.2 Create New Web Service
1. Click "New +" button → "Web Service"
2. Connect your GitHub repository: `hr-agent-bot`
3. Click "Connect"

### 2.3 Configure Service

**Basic Settings:**
- **Name**: `hr-agent-bot` (or your preferred name)
- **Region**: Oregon (or closest to you)
- **Branch**: `main`
- **Root Directory**: (leave blank)
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free

### 2.4 Add Environment Variables
Click "Advanced" → "Add Environment Variable" for each:

| Key | Value | Where to get |
|-----|-------|--------------|
| `NODE_ENV` | `production` | Static value |
| `PORT` | `10000` | Static value (Render default) |
| `GROQ_API_KEY` | `your-groq-api-key` | From https://console.groq.com |
| `SALESFORCE_USERNAME` | `your-sf-username` | Your Salesforce login |
| `SALESFORCE_PASSWORD` | `your-sf-password` | Your Salesforce password |
| `SALESFORCE_SECURITY_TOKEN` | `your-sf-token` | From Salesforce → Settings → Reset Security Token |
| `SALESFORCE_LOGIN_URL` | `https://login.salesforce.com` | Or your sandbox URL |
| `SALESFORCE_API_VERSION` | `v58.0` | Current version |

### 2.5 Deploy
1. Click "Create Web Service"
2. Wait 2-5 minutes for build and deployment
3. Watch the logs in real-time

## Step 3: Verify Deployment

### 3.1 Check Health Endpoint
Once deployed, visit:
```
https://your-app-name.onrender.com/api/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-13T..."
}
```

### 3.2 Test Chat Endpoint
Use Postman or curl:
```bash
curl -X POST https://your-app-name.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","context":{}}'
```

### 3.3 Access UI
Open in browser:
```
https://your-app-name.onrender.com
```

## Step 4: Configure Custom Domain (Optional)

1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain: `hr-bot.yourcompany.com`
4. Follow DNS configuration instructions
5. Render provides free SSL automatically!

## Important: Free Tier Limitations

⚠️ **Free tier services spin down after 15 minutes of inactivity**
- First request after sleep takes ~30 seconds (cold start)
- Fine for testing/low-traffic
- Upgrade to $7/month for always-on service

### Solutions for Cold Starts:
1. **Upgrade to paid plan** ($7/month)
2. **Use UptimeRobot**: Ping your app every 10 minutes
3. **Accept 30s delay** for occasional use

## Troubleshooting

### Build Fails
```bash
# Check Node version compatibility
# Render uses Node 18 by default
```

Add to `package.json` if needed:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### TypeScript Errors
Ensure `tsconfig.json` is committed to repo

### Environment Variables Not Working
- Check spelling (case-sensitive)
- Redeploy after adding new vars
- Check logs for specific errors

### Salesforce Connection Issues
```
Error: INVALID_LOGIN
```
- Verify username/password
- Reset security token if changed password
- Use correct login URL (login vs test)

## Monitoring

### View Logs
1. Go to your service dashboard
2. Click "Logs" tab
3. See real-time application logs

### Useful Log Commands (in your code)
```typescript
console.log('✅ Request processed');
console.error('❌ Error:', error);
```

## Updating Your App

### Auto-Deploy (Recommended)
1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
3. Render automatically detects and redeploys!

### Manual Deploy
1. Go to service dashboard
2. Click "Manual Deploy" → "Deploy latest commit"

## Cost Summary

**Free Tier:**
- 750 hours/month free compute
- 100GB bandwidth/month
- Spins down after 15 min inactivity
- ✅ Perfect for testing

**Starter Plan ($7/month):**
- Always on (no spin down)
- 400 hours compute
- Better for production

## Next Steps

1. ✅ Set up monitoring alerts
2. ✅ Configure custom domain
3. ✅ Test all features thoroughly
4. ✅ Set up UptimeRobot for free tier
5. ✅ Plan upgrade when ready for production

## Support

- **Render Docs**: https://render.com/docs
- **Community Forum**: https://community.render.com
- **Status**: https://status.render.com

## Your Deployed URLs

After deployment, save these:
- **App URL**: https://hr-agent-bot.onrender.com
- **Health Check**: https://hr-agent-bot.onrender.com/api/health
- **Chat API**: https://hr-agent-bot.onrender.com/api/chat
- **Dashboard**: https://hr-agent-bot.onrender.com/manager-dashboard.html

---

🚀 **Ready to deploy? Follow Step 1 above!**
