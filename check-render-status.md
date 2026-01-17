# Render.com Backend Investigation

## Current Status

**Frontend**: ✓ Working (https://know-thyself-frontend.onrender.com)
**Backend**: ✗ Returns 404 errors
**Database**: ✓ Connected and working

## Possible Causes for Backend 404

### 1. Backend Service Not Deployed
**Check**: Log into Render.com dashboard and verify if backend service exists
- Go to: https://dashboard.render.com/
- Look for service named: `know-thyself-backend`
- Check if it's listed in your services

### 2. Backend Deploy Failed
**Check**: Review build logs in Render dashboard
- Click on `know-thyself-backend` service
- Go to "Logs" tab
- Look for build errors or deployment failures
- Common errors:
  - Prisma generation failed
  - Missing environment variables
  - npm install errors

### 3. Backend Service URL is Different
**Check**: Get actual URL from Render dashboard
- In service settings, check the URL
- It might not be exactly `know-thyself-backend.onrender.com`
- Render may have added a hash or used a different name

### 4. Backend Spinning Down (Free Tier)
**Check**: Try waiting 50 seconds after first request
- Free tier spins down after 15 minutes of inactivity
- Takes 30-50 seconds to wake up
- Health check timed out at 15 seconds - may need to wait longer

### 5. Environment Variables Not Set
**Check**: Verify all required env vars are set in Render
Required variables:
- `DATABASE_URL` - Supabase connection string
- `ANTHROPIC_API_KEY` - Claude API key
- `PORT` - Should be 3001 (or auto-set by Render)
- `NODE_ENV` - Should be "production"

## Steps to Diagnose

### Step 1: Check Render Dashboard
1. Go to https://dashboard.render.com/
2. Sign in with your GitHub account (scaryc)
3. Look for services:
   - `know-thyself-frontend` (should exist - we know this works)
   - `know-thyself-backend` (check if this exists)

### Step 2: If Backend Service Exists
1. Click on `know-thyself-backend`
2. Check status indicator (should show green "Live")
3. Note the actual URL (copy it)
4. Go to "Logs" tab:
   - Look for recent activity
   - Check for startup errors
   - Verify it says "Server running on http://localhost:3001"
5. Go to "Environment" tab:
   - Verify `DATABASE_URL` is set
   - Verify `ANTHROPIC_API_KEY` is set
   - Check `NODE_ENV=production`
   - Check `PORT=3001`

### Step 3: If Backend Service Does NOT Exist
The backend was never deployed! You need to:

1. In Render dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository: `scaryc/know-thyself-mvp`
3. Configure service:
   - **Name**: `know-thyself-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm run server`
   - **Branch**: `main`
4. Set environment variables:
   - `DATABASE_URL`: (from your .env file - line 5)
   - `ANTHROPIC_API_KEY`: (from your .env file - line 13)
   - `NODE_ENV`: `production`
   - `PORT`: `3001`
5. Select "Free" plan
6. Click "Create Web Service"
7. Wait 3-5 minutes for deployment

### Step 4: If Backend Exists But Has Errors
1. Check the "Logs" tab for specific error messages
2. Common fixes:
   - **Prisma error**: Make sure `DATABASE_URL` is set correctly
   - **ANTHROPIC_API_KEY error**: Verify API key is valid
   - **Port error**: Make sure `PORT` is set to 3001 or let Render auto-assign
   - **Build failed**: Check if `package.json` has all dependencies

### Step 5: Once Backend is Running
1. Copy the backend URL from Render dashboard
2. Test it manually: `https://YOUR-BACKEND-URL/api/health`
3. Should return: `{"status":"ok"}`
4. Update frontend environment variable:
   - Go to `know-thyself-frontend` service in Render
   - Environment tab
   - Set `VITE_API_URL` to `https://YOUR-BACKEND-URL/api`
   - **Important**: Must end with `/api`
5. Frontend will auto-redeploy (1-2 minutes)

## Quick Test Commands

After getting the actual backend URL, test these endpoints:

```bash
# Replace YOUR-BACKEND-URL with actual URL from Render

# Test health endpoint (should return {"status":"ok"})
curl https://YOUR-BACKEND-URL/api/health

# Test root (should return some message or redirect)
curl https://YOUR-BACKEND-URL/

# Test with longer timeout (if spinning up from sleep)
curl --max-time 60 https://YOUR-BACKEND-URL/api/health
```

## Expected Deployment State

Based on your files, you should have:

1. ✓ **Frontend**: Static site deployed via `render.yaml`
2. ? **Backend**: Web service that should be deployed via `render.yaml`
3. ✓ **Database**: Supabase (external, working)

The `render.yaml` file defines BOTH services, so if you deployed via Blueprint, both should exist.

## Action Items for You

**Please check**:
1. [ ] Does backend service exist in Render dashboard?
2. [ ] If yes, what is the exact URL?
3. [ ] What do the logs show (last 50 lines)?
4. [ ] Are all environment variables set?
5. [ ] What is the service status (Live/Deploy failed/Suspended)?

Report back with answers and I can help you fix the specific issue.

## Alternative: Check GitHub Repository Settings

If you deployed via Blueprint (recommended method):
1. Go to GitHub: https://github.com/scaryc/know-thyself-mvp
2. Check if Render integration is connected
3. Check recent deployments in GitHub Actions or webhook logs

## Last Resort: Redeploy Everything

If you can't figure out what's wrong:
1. Delete existing Render services
2. Start fresh with Blueprint deployment:
   - Go to Render → New + → Blueprint
   - Select `know-thyself-mvp` repository
   - Render reads `render.yaml` and creates both services
   - Set environment variables when prompted
   - Deploy
3. Wait 5-10 minutes for both to build
4. Test again

---

**Next Steps**: Please log into Render dashboard and report what you find!
