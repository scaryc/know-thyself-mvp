# Railway.app Backend Deployment Guide

## Overview

**Frontend**: Render.com (already deployed ✅)
**Backend**: Railway.app (deploying now)
**Database**: Supabase PostgreSQL (already configured ✅)

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Prepare Environment Variables

You'll need these values ready:

1. **Supabase DATABASE_URL**:
   - Login to Supabase.com
   - Go to your project → Settings → Database
   - Copy the **Connection Pooling** connection string (port 6543)
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

2. **Anthropic API Key**:
   - Get from your .env file (starts with `sk-ant-api03-...`)
   - Or create new one at: https://console.anthropic.com/

3. **Render Frontend URL**:
   - Your current frontend URL from Render.com
   - Format: `https://know-thyself-frontend.onrender.com`

---

### Step 2: Create Railway Account

1. Go to **https://railway.app**
2. Click **"Login"**
3. Select **"Login with GitHub"**
4. Authorize Railway to access your GitHub account
5. You'll be redirected to Railway dashboard

---

### Step 3: Deploy from GitHub

1. **Click "New Project"** (big blue button)

2. **Select "Deploy from GitHub repo"**

3. **Configure GitHub App** (if first time):
   - Click "Configure GitHub App"
   - Select your GitHub account: `scaryc`
   - Choose: "Only select repositories"
   - Select: `know-thyself-mvp`
   - Click "Install & Authorize"

4. **Select Repository**:
   - Back on Railway, you should see: `scaryc/know-thyself-mvp`
   - Click on it

5. **Railway Auto-Detection**:
   - Railway will automatically detect it's a Node.js project
   - It will start analyzing the repository
   - Wait for the initial setup (30 seconds)

---

### Step 4: Configure Environment Variables

**IMPORTANT**: Do this BEFORE the first deployment completes!

1. **Click on the service** (should say "know-thyself-mvp")

2. **Go to "Variables" tab** (in the service view)

3. **Click "New Variable"** and add each of these:

#### Required Variables:

```bash
# Database (CRITICAL - Get from Supabase)
DATABASE_URL=postgresql://postgres.barxdvlwfyvhnxodwnmh:[YOUR_PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Anthropic AI (CRITICAL - Get your actual key from .env file)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Environment
NODE_ENV=production

# Port (Railway provides PORT automatically, but we can set default)
PORT=3001
```

#### Optional Variables (for CORS):

```bash
# Frontend URL (add after you get Railway URL)
FRONTEND_URL=https://know-thyself-frontend.onrender.com
```

#### Optional Model Configuration:

```bash
COGNITIVE_COACH_MODEL=claude-3-5-haiku-20241022
CORE_AGENT_MODEL=claude-sonnet-4-20250514
AAR_AGENT_MODEL=claude-3-5-haiku-20241022
```

4. **Click "Add" for each variable**

---

### Step 5: Configure Deployment Settings

1. **Go to "Settings" tab** (in the service view)

2. **Scroll to "Deploy" section**

3. **Verify these settings**:

   **Build Command** (should be auto-detected):
   ```
   npm install && npx prisma generate
   ```

   **Start Command** (should be auto-detected):
   ```
   npx prisma db push --accept-data-loss --skip-generate && npm run server
   ```

   If not set, click "Custom" and enter these commands.

4. **Root Directory**: Leave empty (project is in root)

5. **Watch Paths**: Leave default

---

### Step 6: Trigger Deployment

1. **Go back to "Deployments" tab**

2. **Click "Deploy"** (or it may already be deploying)

3. **Watch the build logs**:
   - Click on the active deployment
   - You'll see real-time logs
   - Look for these success messages:
     ```
     ✓ npm install completed
     ✓ Prisma Client generated
     ✓ Database pushed
     ✓ Server running on port 3001
     ```

4. **Wait 2-3 minutes** for deployment to complete

5. **Check deployment status**:
   - Green check ✅ = Success!
   - Red X ❌ = Failed (check logs for errors)

---

### Step 7: Generate Public Domain

1. **In your service, go to "Settings" tab**

2. **Scroll to "Networking" section**

3. **Click "Generate Domain"**

4. **Railway will create a URL** like:
   ```
   https://know-thyself-mvp-production.up.railway.app
   ```

5. **Copy this URL** - you'll need it for the next steps!

---

### Step 8: Test Backend API

1. **Open your Railway URL in browser** (add `/api/health`):
   ```
   https://your-app-name.up.railway.app/api/health
   ```

2. **You should see**:
   ```json
   {"status":"ok"}
   ```

3. **If you see this** ✅ Backend is working!

4. **If you get an error** ❌ Check:
   - Railway deployment logs
   - Environment variables (especially DATABASE_URL)
   - Supabase database status

---

### Step 9: Update CORS for Render Frontend

Now we need to tell the backend to allow requests from your Render frontend.

1. **In Railway, go to "Variables" tab**

2. **Add or update this variable**:
   ```
   FRONTEND_URL=https://know-thyself-frontend.onrender.com
   ```
   (Replace with your actual Render frontend URL)

3. **Railway will automatically redeploy** (wait 1 minute)

---

### Step 10: Update Render Frontend to Use Railway Backend

Now we need to tell the Render frontend where to find the new Railway backend.

**In Render.com Dashboard**:

1. **Go to your frontend service**: `know-thyself-frontend`

2. **Click "Environment"** (left sidebar)

3. **Find or add** the environment variable:
   ```
   Key: VITE_API_URL
   Value: https://your-railway-app.up.railway.app/api
   ```
   (Replace with your actual Railway URL + `/api`)

4. **Click "Save Changes"**

5. **Render will automatically redeploy frontend** (2-3 minutes)

---

## ✅ VERIFICATION & TESTING

### Test 1: Backend Health Check

```bash
curl https://your-railway-url.up.railway.app/api/health
```

**Expected**: `{"status":"ok"}`

### Test 2: Frontend Loads

1. Open: `https://know-thyself-frontend.onrender.com`
2. Should see registration page
3. No console errors in browser (F12)

### Test 3: Full System Flow

1. **Register a student**:
   - Name: Test Student
   - Language: Slovenčina (SK)
   - Click "Začať výcvik"

2. **Should start session**:
   - Cognitive Coach intro appears
   - Check browser console - no CORS errors
   - AI should respond in Slovak

3. **Test AI interaction**:
   - Type a response
   - AI should reply (may take 5-10 seconds)
   - Verify Slovak language in responses

### Test 4: Database Connection

Check Railway logs for successful database operations:
```
✓ Database connection established
✓ Prisma Client ready
```

---

## 🔍 TROUBLESHOOTING

### Deployment Failed

**Check Railway Logs**:
1. Go to "Deployments" tab
2. Click on failed deployment
3. Look for error messages

**Common Issues**:

- **Missing DATABASE_URL**: Add in Variables
- **Invalid DATABASE_URL**: Verify Supabase connection string
- **Prisma generation failed**: Check schema.prisma syntax
- **Port binding error**: Railway provides PORT automatically

### CORS Errors

**Symptoms**: Browser console shows:
```
Access to fetch at '...' has been blocked by CORS policy
```

**Fix**:
1. Verify `FRONTEND_URL` in Railway variables
2. Check it matches exact Render frontend URL
3. Must include `https://` and no trailing `/`
4. Redeploy if needed

### Database Connection Failed

**Check**:
1. Supabase database is active (not paused)
2. DATABASE_URL uses connection pooler (port 6543)
3. DATABASE_URL has correct password
4. Railway has network access to Supabase

**Test locally**:
```bash
# Add DATABASE_URL to .env
npx prisma db push
# Should connect successfully
```

### Backend Returns 500 Error

**Check Railway Logs** for:
- Missing ANTHROPIC_API_KEY
- Invalid API key
- Anthropic API quota exceeded
- Database query errors

### Frontend Can't Connect to Backend

**Verify**:
1. `VITE_API_URL` in Render frontend environment
2. Railway backend is deployed and running
3. Railway domain is accessible
4. CORS configured correctly

---

## 📊 MONITORING

### Railway Dashboard

- **Deployments**: See build history and logs
- **Metrics**: CPU, memory, network usage
- **Variables**: Manage environment variables
- **Settings**: Configure builds and domains

### Check Logs

```bash
# Railway provides real-time logs in dashboard
# Or use Railway CLI (optional):
railway logs
```

### Usage Limits (Free Tier)

- **Execution time**: 500 hours/month
- **Memory**: 512 MB
- **vCPU**: Shared
- **Storage**: 1 GB

**Estimated usage**: ~100-200 hours/month for development

---

## 🔄 UPDATING CODE

### When You Push to GitHub

1. **Make changes locally**
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "your changes"
   git push
   ```
3. **Railway automatically redeploys** ✅
4. **Render frontend** needs manual redeploy (or trigger from GitHub)

### Manual Redeploy

**Railway**:
- Deployments tab → Click "Deploy Latest"

**Render**:
- Manual Deploy → Clear build cache → Deploy

---

## 💰 COSTS

### Railway.app Free Tier

- ✅ **500 hours/month execution time**
- ✅ **Shared resources**
- ✅ **Automatic SSL**
- ✅ **GitHub integration**

**Cost**: **$0/month** for development/testing

### If You Exceed Free Tier

- **Hobby Plan**: $5/month
- **Pay-as-you-go**: $0.000463/GB-hour

For your app: Free tier should be sufficient!

---

## 🎯 FINAL CHECKLIST

- [ ] Railway account created
- [ ] Backend deployed from GitHub
- [ ] Environment variables configured (DATABASE_URL, ANTHROPIC_API_KEY)
- [ ] Railway domain generated
- [ ] Backend health check works (`/api/health`)
- [ ] CORS configured (FRONTEND_URL)
- [ ] Render frontend updated with Railway backend URL
- [ ] Full system test completed (registration → session → AI response)
- [ ] Slovak translation working in production

---

## 📞 SUPPORT

### Railway Issues
- Railway docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway support: support@railway.app

### Application Issues
- Check Railway deployment logs
- Check Supabase database status
- Check browser console (F12) for frontend errors
- Verify all environment variables are set correctly

---

## 🎉 SUCCESS!

Once everything is working, you'll have:

✅ **Frontend**: Deployed on Render.com (free tier)
✅ **Backend**: Deployed on Railway.app (free tier)
✅ **Database**: Hosted on Supabase (free tier)
✅ **100% Slovak translation** working in production
✅ **Automatic deployments** from GitHub
✅ **SSL certificates** for both frontend and backend

**Total cost: $0/month** for development! 🚀
