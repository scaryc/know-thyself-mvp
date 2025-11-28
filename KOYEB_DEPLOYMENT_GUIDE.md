# Koyeb Deployment Guide - Know Thyself MVP Backend

## 🌟 Why Koyeb?

**Koyeb** is a modern, developer-friendly platform with an excellent free tier:

✅ **2 free web services** (we only need 1!)
✅ **2.5 million requests/month** (plenty for testing/development)
✅ **100GB bandwidth/month**
✅ **Automatic HTTPS/SSL**
✅ **GitHub auto-deploy**
✅ **No credit card required** for free tier
✅ **Super easy web interface** (no CLI needed!)
✅ **Fast European datacenters** (Frankfurt - perfect for Slovakia)

---

## 📋 WHAT YOU'LL NEED

Before starting, have these ready:

1. **GitHub Account** (you have: `scaryc`)
2. **Supabase DATABASE_URL**:
   - Login to Supabase.com
   - Settings → Database → Connection Pooling (port 6543)
   - Example: `postgresql://postgres.xxx:password@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

3. **Anthropic API Key**:
   - Check `server/.env.backup` file
   - Or get from: https://console.anthropic.com
   - Starts with: `sk-ant-api03-...`

4. **Render Frontend URL**:
   - Your current URL: `https://know-thyself-frontend.onrender.com`

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Create Koyeb Account (2 minutes)

1. **Go to**: https://app.koyeb.com/auth/signup

2. **Sign up with GitHub** (recommended):
   - Click **"Sign up with GitHub"**
   - Authorize Koyeb to access your GitHub account
   - **No credit card required!**

3. **Complete profile**:
   - Organization name: Your name or project name
   - Click **"Create organization"**

4. **You're in!** Welcome to Koyeb dashboard 🎉

---

### Step 2: Create New Service (1 minute)

1. **Click "Create Service"** (big button on dashboard)

2. **Select "GitHub"** as deployment method

3. **Connect GitHub** (if first time):
   - Click **"Connect with GitHub"**
   - Authorize Koyeb
   - Select: **"Only select repositories"**
   - Choose: `scaryc/know-thyself-mvp`
   - Click **"Install & Authorize"**

4. **Select Repository**:
   - Repository: `scaryc/know-thyself-mvp`
   - Branch: `main`
   - Click **"Next"**

---

### Step 3: Configure Build Settings (2 minutes)

On the **"Configure"** page:

#### **1. Builder Settings**

- **Builder**: `Buildpack` (auto-selected ✅)
- **Build command**:
  ```
  npm install && npx prisma generate
  ```

#### **2. Run Settings**

- **Run command**:
  ```
  npx prisma db push --accept-data-loss --skip-generate && npm run server
  ```

- **Port**: `8000`

#### **3. Instance Type**

- **Instance**: `Nano` (Free tier) ✅
- **Regions**: `Frankfurt (fra)` ✅ (Closest to Slovakia)
- **Scaling**:
  - Min instances: `1`
  - Max instances: `1`

---

### Step 4: Set Environment Variables (3 minutes)

**CRITICAL**: Scroll down to **"Environment Variables"** section

Click **"Add Variable"** for each of these:

#### **Required Variables**:

1. **DATABASE_URL**:
   ```
   Key: DATABASE_URL
   Value: postgresql://postgres.barxdvlwfyvhnxodwnmh:[YOUR_PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   ✅ Mark as **Secret** (eye icon)

2. **ANTHROPIC_API_KEY**:
   ```
   Key: ANTHROPIC_API_KEY
   Value: sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   ✅ Mark as **Secret** (eye icon)

3. **NODE_ENV**:
   ```
   Key: NODE_ENV
   Value: production
   ```

4. **PORT**:
   ```
   Key: PORT
   Value: 8000
   ```

5. **FRONTEND_URL** (we'll add this after getting Koyeb URL):
   ```
   Key: FRONTEND_URL
   Value: https://know-thyself-frontend.onrender.com
   ```

**Important**:
- Replace `[YOUR_PASSWORD]` in DATABASE_URL with actual Supabase password
- Replace `xxxxx` in ANTHROPIC_API_KEY with your actual key
- Use the **"Secret"** checkbox for sensitive values (DATABASE_URL, ANTHROPIC_API_KEY)

---

### Step 5: Configure Service Name & Deploy (1 minute)

1. **Service name**: `know-thyself-backend`

2. **Exposing**:
   - ✅ Keep **"Publicly accessible"** checked
   - ✅ Keep **"Enable auto-deploy"** checked (deploys on GitHub push)

3. **Review settings** - Should show:
   - Region: Frankfurt
   - Instance: Nano (Free)
   - Environment variables: 5 set

4. **Click "Deploy"** 🚀

---

### Step 6: Wait for Deployment (3-5 minutes)

**What happens now**:

1. ⏳ **Building** - Koyeb clones your GitHub repo and builds
   - Installing npm packages
   - Generating Prisma client

2. ⏳ **Starting** - Running your start command
   - Pushing Prisma schema to database
   - Starting Express server

3. ✅ **Healthy** - Service is running!
   - Health checks passing
   - Ready to receive requests

**Watch the logs** (click "Logs" tab) to see progress.

**Common log messages** (these are good):
```
✓ npm install completed
✓ Prisma Client generated
✓ Database schema synchronized
✓ Server running on port 8000
```

---

### Step 7: Get Your Backend URL (30 seconds)

1. Once status shows **"Healthy"** ✅

2. **Copy your service URL**:
   - Click on your service name: `know-thyself-backend`
   - Look for **"Public URL"** or **"Service URL"**
   - Format: `https://know-thyself-backend-scaryc.koyeb.app`
   - Click **"Copy"** button

3. **Save this URL** - you'll need it for next steps!

---

### Step 8: Test Backend (1 minute)

**Test health endpoint**:

Open in browser or use curl:
```
https://know-thyself-backend-scaryc.koyeb.app/api/health
```

**Expected response**:
```json
{"status":"ok"}
```

✅ **If you see this** → Backend is working perfectly!

❌ **If you get an error** → Check:
- Deployment status (must be "Healthy")
- Environment variables are set correctly
- Database connection (check Supabase is active)
- Logs for error messages

---

### Step 9: Update CORS (Add Frontend URL) (1 minute)

Now that you have your Koyeb backend URL, update the FRONTEND_URL variable:

1. **In Koyeb dashboard** → Your service → **"Settings"** tab

2. **Scroll to "Environment Variables"**

3. **Edit FRONTEND_URL** (or add if you skipped it earlier):
   ```
   Key: FRONTEND_URL
   Value: https://know-thyself-frontend.onrender.com
   ```

4. **Click "Update"**

5. **Koyeb will automatically redeploy** (takes 2-3 minutes)

---

### Step 10: Update Render Frontend (2 minutes)

Now tell your Render frontend where to find the new Koyeb backend:

1. **Go to Render.com** → Dashboard

2. **Click on your frontend service**: `know-thyself-frontend`

3. **Left sidebar** → Click **"Environment"**

4. **Add or update this variable**:
   ```
   Key: VITE_API_URL
   Value: https://know-thyself-backend-scaryc.koyeb.app/api
   ```
   (Replace with your actual Koyeb URL + `/api`)

5. **Click "Save Changes"**

6. **Render will automatically redeploy** frontend (2-3 minutes)

---

### Step 11: Test Complete System! (2 minutes)

**Time to test everything working together!**

1. **Open your frontend**:
   ```
   https://know-thyself-frontend.onrender.com
   ```

2. **You should see** the registration page ✅

3. **Register a test student**:
   - Name: `Test Študent`
   - Email: `test@example.com` (optional)
   - Consent: ✅ Check the box
   - **Language**: Select **"Slovenčina"** 🇸🇰

4. **Click "Začať výcvik"** (Start Training)

5. **Cognitive Coach should appear**:
   - Should introduce in **Slovak**!
   - "Dobrý deň! Som tvoj kognitívny kouč..."

6. **Interact with AI**:
   - Type a response
   - AI should reply in **Slovak**
   - Check browser console (F12) for no errors

✅ **If Slovak AI works** → SUCCESS! Everything is deployed! 🎉

---

## 📊 FREE TIER LIMITS

Your Koyeb free tier includes:

| Resource | Free Tier | Your Usage | Status |
|----------|-----------|------------|--------|
| **Web Services** | 2 services | 1 used | ✅ 50% used |
| **Instances** | Nano (shared) | 1 instance | ✅ Perfect fit |
| **Requests** | 2.5M/month | ~10K/month | ✅ 0.4% used |
| **Bandwidth** | 100GB/month | ~5-10GB | ✅ 10% used |
| **Build time** | Unlimited | - | ✅ No limits! |
| **Runtime** | Unlimited | 24/7 | ✅ Always on |

**Your app easily fits in free tier!** 🎉

---

## 🔄 AUTO-DEPLOYMENT FROM GITHUB

**Already configured!** ✅

When you push to GitHub:

1. **You commit and push**:
   ```bash
   git add .
   git commit -m "your changes"
   git push
   ```

2. **Koyeb automatically**:
   - Detects the push
   - Pulls latest code
   - Rebuilds the service
   - Deploys new version
   - Runs health checks

3. **Zero downtime deployment**:
   - New version starts
   - Health checks pass
   - Traffic switches over
   - Old version stops

**Watch it happen**: Koyeb dashboard → Deployments tab

---

## 🛠️ USEFUL KOYEB FEATURES

### View Logs

**Real-time logs**:
1. Go to your service
2. Click **"Logs"** tab
3. See live server output
4. Filter by time or search

**Tail logs** (auto-refresh):
- Logs refresh every few seconds automatically
- Great for debugging

### Metrics & Monitoring

1. Click **"Metrics"** tab
2. See:
   - CPU usage
   - Memory usage
   - Request count
   - Response times
   - HTTP status codes

### Restart Service

If something goes wrong:
1. Service → **"Settings"**
2. Click **"Restart Service"**
3. Fresh deployment in 2-3 minutes

### Redeploy

Force a new deployment:
1. Service → **"Deployments"** tab
2. Click **"Redeploy"** on latest deployment
3. Rebuilds from scratch

---

## 🔧 TROUBLESHOOTING

### Build Failed

**Symptoms**: Status stuck on "Building" then fails

**Check**:
1. **Logs** tab → Look for error messages
2. Common issues:
   - `npm install` failed → Check package.json syntax
   - Prisma generation failed → Check schema.prisma
   - Out of memory → Unlikely with your app

**Fix**:
- Fix the issue in your code
- Push to GitHub
- Koyeb auto-redeploys

### Service Unhealthy

**Symptoms**: Status shows "Unhealthy" or keeps restarting

**Check**:
1. **Logs** → Look for crash/error messages
2. Common issues:
   - Database connection failed
   - Missing environment variables
   - Port mismatch (must be 8000)

**Fix**:
- **Database**: Verify DATABASE_URL is correct
- **Env vars**: Settings → Environment Variables → Check all 5 are set
- **Port**: Verify PORT=8000

### CORS Errors

**Symptoms**: Frontend can't connect to backend, browser console shows:
```
Access to fetch at '...' has been blocked by CORS policy
```

**Fix**:
1. Check FRONTEND_URL in Koyeb environment variables
2. Must exactly match Render frontend URL
3. Include `https://` and no trailing `/`
4. Update → Redeploy

### Database Connection Failed

**Symptoms**: Logs show:
```
Error: Can't reach database server
P1001: Can't reach database server at ...
```

**Check**:
1. **Supabase is active** (not paused)
2. **DATABASE_URL is correct**:
   - Uses connection pooler (port 6543)
   - Includes `?pgbouncer=true`
   - Password is correct
3. **Network connectivity**:
   - Koyeb can reach Supabase (usually works)

**Fix**:
- Login to Supabase → Check database status
- Copy fresh DATABASE_URL from Supabase
- Update in Koyeb → Redeploy

### Anthropic API Errors

**Symptoms**: AI doesn't respond, logs show:
```
Error: Invalid API key
Error: Anthropic API quota exceeded
```

**Fix**:
1. **Check ANTHROPIC_API_KEY** in Koyeb environment
2. **Verify key is valid**: Login to console.anthropic.com
3. **Check quota**: Make sure you have credits
4. Update key → Redeploy

### Frontend Can't Connect

**Symptoms**: Registration works, but AI doesn't respond

**Check**:
1. **Backend is healthy**: Koyeb shows ✅ Healthy
2. **Backend URL works**: Test `/api/health` endpoint
3. **VITE_API_URL in Render**:
   - Must point to Koyeb URL + `/api`
   - Example: `https://your-app.koyeb.app/api`
4. **No typos** in URL

**Fix**:
- Double-check VITE_API_URL in Render
- Must end with `/api`
- Render → Save → Redeploy

---

## 💡 BEST PRACTICES

### Environment Variables

✅ **DO**:
- Mark sensitive values as "Secret"
- Use connection pooler (port 6543) for DATABASE_URL
- Keep FRONTEND_URL updated

❌ **DON'T**:
- Commit secrets to Git
- Share API keys publicly
- Use direct connection (port 5432) for production

### Monitoring

**Check regularly**:
- Service status (should be "Healthy")
- Logs for errors or warnings
- Metrics for usage trends

**Set up alerts** (optional):
- Email notifications on deployment failures
- Slack integration for status changes

### Performance

**Free tier optimization**:
- Nano instance is perfect for your traffic
- Auto-scaling not needed (keeps costs $0)
- Frankfurt region is fast for Europe

---

## 🔄 UPDATING YOUR APP

### Making Code Changes

1. **Edit code locally**

2. **Test locally** (optional but recommended):
   ```bash
   npm run server  # Test backend
   cd know-thyself-frontend && npm run dev  # Test frontend
   ```

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: your changes"
   git push
   ```

4. **Koyeb auto-deploys** (2-3 minutes)

5. **Verify deployment**:
   - Check Koyeb dashboard
   - Status should be "Healthy"
   - Test your changes in production

### Updating Dependencies

**Update package.json** locally:
```bash
npm update
```

**Commit and push** → Koyeb rebuilds with new packages

### Database Schema Changes

**Update prisma/schema.prisma**:

1. Edit schema locally
2. Test migration:
   ```bash
   npx prisma db push
   ```
3. Commit and push
4. Koyeb runs `prisma db push` during deployment

---

## 💰 COST BREAKDOWN

### Free Tier (Current)

| Item | Cost |
|------|------|
| **Koyeb Backend** | $0/month ✅ |
| **Render Frontend** | $0/month ✅ |
| **Supabase Database** | $0/month ✅ |
| **Anthropic API** | Pay-per-use (~$0.01-0.10/session) |

**Total infrastructure cost**: **$0/month** 🎉

### If You Exceed Free Tier (Unlikely)

**Koyeb pricing**:
- Nano: $0/month (free tier) ✅ Current
- Micro: $7/month (if you outgrow free tier)
- Small: $14/month (for high traffic)

**Your usage**: Free tier is plenty! You'd need 2.5M+ requests/month to exceed it.

---

## 📚 ADDITIONAL RESOURCES

### Koyeb Documentation
- **Getting Started**: https://www.koyeb.com/docs/getting-started
- **Node.js Guide**: https://www.koyeb.com/docs/deploy/nodejs
- **Environment Variables**: https://www.koyeb.com/docs/build-and-deploy/environment-variables
- **Auto-deploy**: https://www.koyeb.com/docs/build-and-deploy/github

### Support
- **Koyeb Support**: support@koyeb.com
- **Community Discord**: https://www.koyeb.com/community
- **Status Page**: https://status.koyeb.com

### Your Stack
- **Supabase Docs**: https://supabase.com/docs
- **Anthropic API**: https://docs.anthropic.com
- **Prisma Docs**: https://www.prisma.io/docs

---

## ✅ DEPLOYMENT CHECKLIST

Use this checklist to verify everything is set up correctly:

### Pre-Deployment
- [ ] Koyeb account created
- [ ] GitHub repository connected
- [ ] DATABASE_URL copied from Supabase
- [ ] ANTHROPIC_API_KEY ready
- [ ] Render frontend URL noted

### Deployment
- [ ] Service created in Koyeb
- [ ] Build command set: `npm install && npx prisma generate`
- [ ] Run command set: `npx prisma db push ... && npm run server`
- [ ] Port set to: `8000`
- [ ] Instance type: `Nano` (free)
- [ ] Region: `Frankfurt`
- [ ] All 5 environment variables added
- [ ] Sensitive variables marked as "Secret"
- [ ] Auto-deploy enabled

### Post-Deployment
- [ ] Service status: "Healthy" ✅
- [ ] Backend URL obtained
- [ ] Health check works: `/api/health` returns `{"status":"ok"}`
- [ ] FRONTEND_URL added to Koyeb
- [ ] VITE_API_URL updated in Render frontend
- [ ] Render frontend redeployed

### Testing
- [ ] Frontend loads correctly
- [ ] Can register student
- [ ] Language switcher works (EN/SK)
- [ ] Can start session
- [ ] Cognitive Coach appears
- [ ] **AI responds in Slovak** 🇸🇰
- [ ] No console errors in browser (F12)
- [ ] Can interact with AI normally

---

## 🎉 SUCCESS!

Once you complete all steps, you'll have:

✅ **Backend**: Deployed on Koyeb (Frankfurt, free tier)
✅ **Frontend**: Deployed on Render (free tier)
✅ **Database**: Hosted on Supabase (free tier)
✅ **Auto-deploy**: GitHub push → automatic deployment
✅ **HTTPS/SSL**: Both frontend and backend secured
✅ **Slovak translation**: 100% working in production
✅ **Total cost**: $0/month for infrastructure

**Congratulations!** 🚀

Your paramedic training platform is now live and accessible worldwide!

---

## 🆘 NEED HELP?

If you get stuck at any step:

1. **Check the logs** in Koyeb dashboard
2. **Review this guide** step-by-step
3. **Verify environment variables** are set correctly
4. **Test backend health**: `/api/health` endpoint
5. **Check browser console** (F12) for frontend errors

**Still stuck?** Common issues are covered in the Troubleshooting section above!
