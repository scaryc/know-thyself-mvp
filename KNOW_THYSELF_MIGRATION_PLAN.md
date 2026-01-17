# Know Thyself MVP - Migration Plan to Koyeb + Vercel

**Date**: January 2026
**Goal**: Migrate from Render (broken backend) to Koyeb (backend) + Vercel (frontend)
**Cost**: $0/month (both on free tiers)
**Time**: 2-3 hours

---

## Current State

**Backend**: Render.com (BROKEN - returns 404)
**Frontend**: Render.com (WORKING)
**Database**: Supabase (WORKING - keep unchanged)

**Problem**: Backend has failed/never deployed properly on Render

---

## Target State

**Backend**: Koyeb Hobby (Frankfurt) - FREE
**Frontend**: Vercel (Global CDN) - FREE
**Database**: Supabase - No changes

**Benefits**:
- ✅ Free hosting for both services
- ✅ Backend closer to Slovakia (Frankfurt)
- ✅ Frontend on global CDN (faster worldwide)
- ✅ Reliable auto-deployments from GitHub

---

## Prerequisites

Before starting, have ready:

1. ✅ GitHub account: `scaryc`
2. ✅ Repository: `scaryc/know-thyself-mvp` (main branch)
3. ✅ Supabase database URL (from `.env` file)
4. ✅ Anthropic API key (from `.env` file)
5. ✅ Your latest code pushed to GitHub

---

## Phase 1: Deploy Backend to Koyeb (60 minutes)

### Step 1.1: Sign Up for Koyeb (5 minutes)

1. Open browser: https://app.koyeb.com/auth/signup

2. Click **"Sign up with GitHub"**

3. Authorize Koyeb:
   - Click "Authorize Koyeb"
   - Allow access to your repositories

4. **No credit card required** for Hobby plan ✅

5. You'll land on Koyeb dashboard

---

### Step 1.2: Connect GitHub Repository (5 minutes)

1. In Koyeb dashboard, click **"Create Service"**

2. Choose deployment method: **"GitHub"**

3. Click **"Connect with GitHub"** (if first time)

4. In GitHub authorization popup:
   - Select: **"Only select repositories"**
   - Choose: `scaryc/know-thyself-mvp`
   - Click **"Install & Authorize"**

5. Back in Koyeb, you should see your repository listed

---

### Step 1.3: Configure Service Settings (10 minutes)

**Repository Configuration**:
- Repository: `scaryc/know-thyself-mvp`
- Branch: `main`
- Click **"Next"** or **"Configure"**

**Builder Settings**:
- Builder: **Buildpack** (should auto-detect Node.js)
- Build command:
  ```
  npm install && npx prisma generate
  ```

**Run Settings**:
- Run command:
  ```
  npx prisma db push --accept-data-loss --skip-generate && npm run server
  ```
- Port: **8000**

**Instance Settings**:
- Region: **Frankfurt (fra)** ⭐ Closest to Slovakia
- Instance type: **Nano**
- Plan: **Hobby** (FREE) ✅

**Service Name**:
- Name: `know-thyself-backend`

---

### Step 1.4: Set Environment Variables (10 minutes)

Click **"Add Environment Variable"** and add each of these:

**1. DATABASE_URL**
```
postgresql://YOUR_SUPABASE_CONNECTION_STRING
```
⚠️ Copy this from your `.env` file - use the Supabase connection pooler URL (port 5432)

**2. ANTHROPIC_API_KEY**
```
sk-ant-api03-YOUR_ANTHROPIC_API_KEY_HERE
```
⚠️ Copy this from your `.env` file - your Claude API key

**3. NODE_ENV**
```
production
```

**4. PORT**
```
8000
```

**5. FRONTEND_URL** (temporary - will update later)
```
https://know-thyself-frontend.onrender.com
```
⚠️ You'll update this after deploying frontend to Vercel

---

### Step 1.5: Configure Health Check (5 minutes)

**Optional but recommended**:

- Health check path: `/api/health`
- Port: `8000`
- Interval: `30` seconds
- Timeout: `5` seconds
- Healthy threshold: `1`
- Unhealthy threshold: `3`

---

### Step 1.6: Deploy Service (20 minutes)

1. Review all settings

2. Click **"Create Service"** or **"Deploy"**

3. **Watch build logs**:
   - Click on your service
   - Go to **"Logs"** tab
   - Watch real-time deployment

**Expected log output**:
```
> Installing dependencies (npm install)...
> Generating Prisma client...
> Running Prisma db push...
> Starting server (npm run server)...
> 🚀 Know Thyself MVP Server running on http://localhost:8000
```

4. **Deployment time**: 3-5 minutes

5. **Success indicators**:
   - Status badge shows **"Live"** (green)
   - Logs show "Server running"
   - No error messages in red

---

### Step 1.7: Get Backend URL (2 minutes)

1. In Koyeb service overview, find your URL:
   - Format: `https://know-thyself-backend-YOUR-ORG.koyeb.app`

2. **Copy this URL** - you'll need it for:
   - Testing
   - Frontend environment variable

3. Example: `https://know-thyself-backend-scaryc-123abc.koyeb.app`

---

### Step 1.8: Test Backend (3 minutes)

**Test 1: Health Endpoint**

Open browser or use curl:
```bash
curl https://YOUR-BACKEND-URL.koyeb.app/api/health
```

Expected response:
```json
{"status":"ok"}
```

**Test 2: Check Logs**

In Koyeb dashboard → Logs tab:
- Should see server startup messages
- No error messages
- Database connection successful

**If you see errors**:
- See "Troubleshooting Backend" section at end of this document

---

## Phase 2: Deploy Frontend to Vercel (40 minutes)

### Step 2.1: Sign Up for Vercel (5 minutes)

1. Open browser: https://vercel.com/signup

2. Click **"Continue with GitHub"**

3. Authorize Vercel:
   - Click "Authorize Vercel"
   - Allow access to repositories

4. You'll land on Vercel dashboard

---

### Step 2.2: Import Project (5 minutes)

1. Click **"Add New..."** → **"Project"**

2. In **"Import Git Repository"** section:
   - Find: `scaryc/know-thyself-mvp`
   - Click **"Import"**

3. Vercel will analyze your repository

---

### Step 2.3: Configure Project (10 minutes)

**CRITICAL: Set Root Directory**

⚠️ **Most important step**:
- Root Directory: `know-thyself-frontend`
- Click **"Edit"** next to "Root Directory"
- Type: `know-thyself-frontend`
- Click **"Continue"**

**Framework Preset**:
- Should auto-detect: **Vite** ✅
- If not, select "Vite" from dropdown

**Build Settings**:
- Build Command: `npm run build` (auto-detected ✅)
- Output Directory: `dist` (auto-detected ✅)
- Install Command: `npm install` (auto-detected ✅)

**Project Name**:
- Name: `know-thyself-mvp` (or customize)

---

### Step 2.4: Set Environment Variables (5 minutes)

Click **"Environment Variables"** section

Add variable:
- **Key**: `VITE_API_URL`
- **Value**: `https://YOUR-KOYEB-BACKEND-URL.koyeb.app/api`

⚠️ **IMPORTANT**:
- Use YOUR actual Koyeb backend URL from Phase 1
- **Must end with `/api`**
- Example: `https://know-thyself-backend-scaryc-123abc.koyeb.app/api`

**Environment**: Select all (Production, Preview, Development)

Click **"Add"**

---

### Step 2.5: Deploy (10 minutes)

1. Click **"Deploy"**

2. **Watch deployment**:
   - Vercel shows real-time build logs
   - Very fast (20-60 seconds typical)

**Expected build output**:
```
Installing dependencies...
Running "npm run build"
> tsc -b && vite build
Building for production...
✓ built in 15s
Uploading to CDN...
✓ Deployment ready
```

3. **Success!**
   - Status: **"Ready"**
   - URL shown: `https://know-thyself-mvp.vercel.app` (or similar)
   - Green checkmark ✅

---

### Step 2.6: Get Frontend URL (2 minutes)

1. Copy your Vercel URL:
   - Format: `https://know-thyself-mvp-YOUR-USERNAME.vercel.app`
   - Or custom: `https://know-thyself-mvp.vercel.app`

2. **Save this URL** - you'll need it to update backend CORS

---

### Step 2.7: Test Frontend (3 minutes)

**Test 1: Load Homepage**

1. Visit your Vercel URL
2. Should load Know Thyself interface
3. No errors in browser console (press F12)

**Test 2: Check API Connection**

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Should see no CORS errors
4. Network tab should show successful API calls

**If you see CORS errors**:
- Continue to Phase 3 to fix

---

## Phase 3: Update Backend CORS (10 minutes)

### Step 3.1: Update Koyeb Environment Variable

1. Go back to Koyeb dashboard: https://app.koyeb.com/

2. Click on your `know-thyself-backend` service

3. Go to **"Settings"** → **"Environment"** tab

4. Find `FRONTEND_URL` variable

5. Click **"Edit"**

6. Update value to your Vercel URL:
   ```
   https://YOUR-VERCEL-URL.vercel.app
   ```
   Example: `https://know-thyself-mvp.vercel.app`

7. Click **"Save"**

8. Koyeb will automatically redeploy (1-2 minutes)

---

### Step 3.2: Verify CORS Fixed

1. Wait for Koyeb redeploy to complete (watch status)

2. Go back to your Vercel frontend URL

3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

4. Open browser DevTools (F12) → Console tab

5. Should see **no CORS errors** ✅

---

## Phase 4: End-to-End Testing (20 minutes)

### Test 4.1: Registration Flow

1. Go to your Vercel URL

2. Fill out registration form:
   - Name: "Test Student"
   - Email: "test@example.com"

3. Submit registration

4. Should see success message

5. **Verify in Supabase**:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Table Editor → `Student` table
   - Should see new test student ✅

---

### Test 4.2: Start Training Session

1. Click to start training

2. Should see cognitive coach questions

3. Answer questions

4. Should successfully transition to scenario

---

### Test 4.3: Scenario Interaction

1. AI should respond to your messages

2. Patient vitals should update

3. Actions should be logged

4. **Verify in Supabase**:
   - Table Editor → `Session` table
   - Should see new session ✅
   - Table Editor → `Message` table
   - Should see conversation messages ✅

---

### Test 4.4: Complete AAR

1. Complete scenario

2. Should transition to AAR (After Action Review)

3. AI should provide feedback

4. Performance data should be saved

---

## Phase 5: Cleanup Old Deployments (10 minutes)

### Clean Up Render

1. **Delete broken Render backend**:
   - Go to https://dashboard.render.com/
   - Find `know-thyself-backend` service
   - Settings → "Delete Service"
   - Confirm deletion

2. **Keep or delete Render frontend** (your choice):
   - Option A: Keep as backup (costs nothing)
   - Option B: Delete to simplify (frontend now on Vercel)

---

## Phase 6: Update Local Development (5 minutes)

### Update Frontend .env File

**File**: `know-thyself-frontend/.env`

**Change from**:
```
VITE_API_URL=http://localhost:3001/api
```

**To** (for production testing):
```
# Local development
VITE_API_URL=http://localhost:3001/api

# Or test against production backend
# VITE_API_URL=https://YOUR-KOYEB-URL.koyeb.app/api
```

**Note**: Keep localhost for local development, comment/uncomment as needed

---

## Verification Checklist

After migration, verify everything works:

### Backend Health
- [ ] Koyeb service status shows "Live" (green)
- [ ] `/api/health` endpoint returns `{"status":"ok"}`
- [ ] Logs show no errors
- [ ] Prisma connected to Supabase successfully

### Frontend Health
- [ ] Vercel deployment shows "Ready"
- [ ] Website loads without errors
- [ ] No CORS errors in browser console
- [ ] Can register new students
- [ ] Can start training sessions

### Database Health
- [ ] Supabase shows new sessions
- [ ] Message table populates with conversations
- [ ] Student table shows registered users
- [ ] No connection errors in logs

### Auto-Deploy Works
- [ ] Push code to GitHub main branch
- [ ] Koyeb auto-deploys backend (2-4 min)
- [ ] Vercel auto-deploys frontend (20-60 sec)
- [ ] Both show successful deployment

---

## Your New Production URLs

**Update after deployment**:

```
Backend (Koyeb):  https://_____________________.koyeb.app
Frontend (Vercel): https://_____________________.vercel.app
Database:          Supabase (unchanged)
```

Share the **Vercel URL** with your students!

---

## Cost Breakdown

| Service | Platform | Plan | Cost |
|---------|----------|------|------|
| Backend | Koyeb | Hobby | **$0** |
| Frontend | Vercel | Free | **$0** |
| Database | Supabase | Free | **$0** |
| **TOTAL** | | | **$0/month** |

**Free tier limits**:
- Koyeb Hobby: 1 free web service (512MB RAM, 0.1 vCPU)
- Vercel Free: Unlimited static sites, 100GB bandwidth/month
- Supabase Free: 500MB database, 2GB storage

**You're well within limits** ✅

---

## Monitoring & Maintenance

### Daily Checks

**Koyeb Dashboard**: https://app.koyeb.com/
- Check service status (should be "Live")
- Review logs for errors
- Monitor uptime

**Vercel Dashboard**: https://vercel.com/dashboard
- Check deployment status
- Review analytics (page views, performance)
- Monitor bandwidth usage

**Supabase Dashboard**: https://supabase.com/dashboard
- Check database size
- Review query performance
- Monitor active connections

---

## Automatic Deployments

**Every time you push to GitHub**:

1. You: `git push origin main`

2. Koyeb automatically:
   - Detects changes
   - Runs `npm install && npx prisma generate`
   - Runs `npm run server`
   - Deploys in 2-4 minutes
   - Sends email notification

3. Vercel automatically:
   - Detects changes
   - Runs `npm run build`
   - Deploys to CDN
   - Completes in 20-60 seconds
   - Sends email notification

**No manual deployment needed!** ✅

---

## Troubleshooting

### Backend Issues

#### Problem: Build fails on Koyeb

**Check**:
1. Koyeb logs for specific error
2. Verify `package.json` has all dependencies
3. Check Node.js version compatibility

**Common fixes**:
```bash
# If Prisma fails
- Verify DATABASE_URL is set correctly
- Check Prisma schema is valid
- Ensure prisma generate is in build command

# If npm install fails
- Check package.json syntax
- Verify all dependencies exist in npm registry
```

#### Problem: Server won't start

**Check**:
1. PORT environment variable is set to `8000`
2. Server starts successfully in logs
3. No uncaught exceptions

**Fix**:
- Check Koyeb logs for startup errors
- Verify all environment variables are set
- Ensure `npm run server` works locally

#### Problem: Database connection fails

**Check**:
1. DATABASE_URL is correct
2. Supabase database is running
3. Connection pooler is enabled

**Fix**:
```
DATABASE_URL format must be:
postgresql://YOUR_USER:YOUR_PASSWORD@aws-region.pooler.supabase.com:5432/postgres

Not the direct connection URL!
Use the pooler URL (port 5432)
Copy the exact value from your .env file
```

---

### Frontend Issues

#### Problem: Build fails on Vercel

**Check**:
1. Root directory is set to `know-thyself-frontend` ⚠️ MOST COMMON
2. TypeScript compilation succeeds
3. Vite build completes

**Fix**:
- Vercel Settings → Root Directory → `know-thyself-frontend`
- Check build logs for TypeScript errors
- Ensure `npm run build` works locally

#### Problem: CORS errors in browser

**Symptoms**:
```
Access to fetch at 'https://backend.koyeb.app/api/...' from origin 'https://frontend.vercel.app'
has been blocked by CORS policy
```

**Fix**:
1. Update `FRONTEND_URL` in Koyeb backend env vars
2. Must match exact Vercel URL (including https://)
3. Wait for Koyeb to redeploy (1-2 min)
4. Hard refresh frontend (Ctrl+Shift+R)

#### Problem: API calls fail (404)

**Check**:
1. `VITE_API_URL` ends with `/api` ⚠️ CRITICAL
2. Backend is actually running on Koyeb
3. URL is correct

**Fix**:
```
Correct: https://backend.koyeb.app/api
Wrong:   https://backend.koyeb.app
Wrong:   https://backend.koyeb.app/api/
```

---

### Database Issues

#### Problem: Supabase connection timeout

**Check**:
1. Using connection pooler (port 5432)
2. Not using direct connection (port 6543)
3. Supabase database is not paused

**Fix**:
- Use pooler URL: `...pooler.supabase.com:5432...`
- Wake up database if paused (visit Supabase dashboard)

#### Problem: Prisma schema mismatch

**Symptoms**: Prisma errors about missing tables/columns

**Fix**:
```bash
# Koyeb runs this automatically:
npx prisma db push --accept-data-loss --skip-generate

# This syncs your schema.prisma with Supabase
```

---

## Rollback Plan

### If Migration Fails Completely

**Option 1: Return to Render Frontend**

1. Your Render frontend is still working
2. It still points to old (broken) backend
3. You'd need to fix Render backend separately

**Option 2: Keep Trying with Koyeb/Vercel**

1. Koyeb has excellent logs - shows exactly what's wrong
2. Vercel build errors are very clear
3. Both have good documentation
4. Can retry deployment multiple times
5. No cost for failed attempts

**Option 3: Try Alternative Platform**

If Koyeb/Vercel absolutely won't work:
- Railway.app ($5/month trial)
- Fly.io (~$8/month)

But **Koyeb + Vercel should work** - they're designed for Node.js + React!

---

## Getting Help

### Koyeb Support
- Documentation: https://www.koyeb.com/docs
- Community Forum: https://community.koyeb.com/
- Status Page: https://status.koyeb.com/
- Discord: Available via community

### Vercel Support
- Documentation: https://vercel.com/docs
- Discord: https://vercel.com/discord
- GitHub Discussions: https://github.com/vercel/vercel/discussions
- Status: https://www.vercel-status.com/

### Anthropic Claude API
- Documentation: https://docs.anthropic.com/
- Console: https://console.anthropic.com/
- Support: support@anthropic.com

### Supabase
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com/
- Status: https://status.supabase.com/

---

## Post-Migration Tasks

### 1. Update Documentation

Update these files in your repo:
- `README.md` - Add new deployment URLs
- `.env.example` - Update with Koyeb/Vercel examples

### 2. Test with Real Students

1. Send Vercel URL to 2-3 test students
2. Have them complete full scenario
3. Verify their data appears in Supabase
4. Check for any errors in Koyeb logs

### 3. Monitor for 48 Hours

Watch dashboards closely first 2 days:
- Any errors in Koyeb logs?
- Any failed requests in Vercel analytics?
- Any database connection issues?

### 4. Schedule Testing Sessions

Plan your 30 testing sessions:
- Backend won't spin down on Koyeb Hobby
- Can handle concurrent users
- Supabase free tier supports this load

---

## Timeline

**Realistic timeline for migration**:

**Hour 1**: Deploy backend to Koyeb
- Sign up, configure, deploy
- Test health endpoint
- Debug if needed

**Hour 2**: Deploy frontend to Vercel
- Sign up, configure, deploy
- Set environment variables
- Update backend CORS

**Hour 3**: Testing and verification
- End-to-end test
- Create test session
- Verify data in Supabase
- Clean up old deployments

**Total**: 2-3 hours (with some buffer for learning curve)

---

## Success Criteria

✅ **Migration is successful when**:

1. Backend `/api/health` returns 200 OK
2. Frontend loads without errors
3. Can register new student
4. Can complete full scenario workflow
5. Data appears in Supabase
6. No CORS errors
7. Auto-deploy works from git push
8. Total cost is $0/month

---

## Final Checklist

Before declaring migration complete:

**Backend**:
- [ ] Koyeb service shows "Live" status
- [ ] Health endpoint accessible
- [ ] All environment variables set
- [ ] Logs show successful startup
- [ ] Database connection works

**Frontend**:
- [ ] Vercel deployment shows "Ready"
- [ ] Site loads in browser
- [ ] No console errors
- [ ] API calls succeed
- [ ] VITE_API_URL is correct

**Integration**:
- [ ] Can register student
- [ ] Can start scenario
- [ ] AI responds correctly
- [ ] Data saves to Supabase
- [ ] AAR generates successfully

**Cleanup**:
- [ ] Old Render backend deleted
- [ ] Documentation updated
- [ ] URLs shared with stakeholders

---

## Next Steps

**Start now**:

1. Open two browser tabs:
   - Tab 1: https://app.koyeb.com/auth/signup
   - Tab 2: This migration guide

2. Follow Phase 1 (Deploy Backend to Koyeb)

3. Work through phases sequentially

4. Don't skip verification steps

5. If stuck, check Troubleshooting section

6. Report success/issues in new chat window

**Good luck!** 🚀

This migration will give you a reliable, free, and performant production environment for your Know Thyself MVP testing with 30 students.
