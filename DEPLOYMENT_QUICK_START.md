# Know Thyself MVP - Deployment Quick Start

**Status**: ✅ Codebase is ready for deployment (25/25 checks passed)

---

## Pre-Deployment Checklist

- [x] Codebase verified and ready
- [x] Git repository configured (scaryc/know-thyself-mvp)
- [x] All dependencies in place
- [x] Prisma schema ready
- [x] Environment variables documented
- [ ] Latest code pushed to GitHub
- [ ] Ready to deploy to Koyeb
- [ ] Ready to deploy to Vercel

---

## Quick Reference: Environment Variables

### For Koyeb Backend

Copy these values from your `.env` file:

```bash
DATABASE_URL=postgresql://YOUR_SUPABASE_CONNECTION_STRING
# Copy from your .env file

ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ANTHROPIC_API_KEY_HERE
# Copy from your .env file

NODE_ENV=production

PORT=8000

FRONTEND_URL=https://know-thyself-frontend.onrender.com
# (You'll update this after Vercel deployment)
```

### For Vercel Frontend

```bash
VITE_API_URL=https://YOUR-KOYEB-BACKEND-URL.koyeb.app/api
# (You'll get this URL from Koyeb after backend deployment)
```

---

## Deployment Flow

```
1. Push to GitHub
   ↓
2. Deploy Backend to Koyeb (20 min)
   ↓ Get backend URL
3. Deploy Frontend to Vercel (10 min)
   ↓ Get frontend URL
4. Update CORS in Koyeb (5 min)
   ↓
5. Test End-to-End (15 min)
   ↓
6. Done! 🎉
```

---

## Phase 1: Koyeb Backend (20 minutes)

### Step 1: Sign Up & Connect GitHub (5 min)

1. Visit: https://app.koyeb.com/auth/signup
2. Click "Sign up with GitHub"
3. Authorize Koyeb for repository: `scaryc/know-thyself-mvp`

### Step 2: Create Service (10 min)

**Repository Settings:**
- Repository: `scaryc/know-thyself-mvp`
- Branch: `main`

**Builder Settings:**
- Builder: Buildpack (Node.js auto-detected)
- Build command:
  ```
  npm install && npx prisma generate
  ```

**Run Settings:**
- Run command:
  ```
  npx prisma db push --accept-data-loss --skip-generate && npm run server
  ```
- Port: `8000`

**Instance Settings:**
- Region: **Frankfurt (fra)** ← Closest to Slovakia
- Instance type: Nano
- Plan: Hobby (FREE)

**Service Name:**
- Name: `know-thyself-backend`

### Step 3: Set Environment Variables (5 min)

Add these 5 variables (see values above):
1. DATABASE_URL
2. ANTHROPIC_API_KEY
3. NODE_ENV
4. PORT
5. FRONTEND_URL

### Step 4: Deploy & Test

Click "Deploy" and wait 3-5 minutes.

**Test:**
```bash
curl https://YOUR-BACKEND-URL.koyeb.app/api/health
# Should return: {"status":"ok"}
```

**Save your backend URL** - you'll need it for Vercel!

---

## Phase 2: Vercel Frontend (10 minutes)

### Step 1: Sign Up & Import (3 min)

1. Visit: https://vercel.com/signup
2. Click "Continue with GitHub"
3. Click "Add New..." → "Project"
4. Import `scaryc/know-thyself-mvp`

### Step 2: Configure Project (5 min)

**CRITICAL: Set Root Directory**
- Root Directory: `know-thyself-frontend` ⚠️ MUST SET THIS

**Framework Settings:**
- Framework Preset: Vite (auto-detected)
- Build Command: `npm run build` (auto-detected)
- Output Directory: `dist` (auto-detected)

**Environment Variable:**
- Key: `VITE_API_URL`
- Value: `https://YOUR-KOYEB-URL.koyeb.app/api` ← Use YOUR backend URL
- Select: All environments

### Step 3: Deploy

Click "Deploy" and wait 20-60 seconds.

**Save your frontend URL** - you'll need it to update CORS!

---

## Phase 3: Update CORS (5 minutes)

1. Go to Koyeb dashboard
2. Open `know-thyself-backend` service
3. Settings → Environment
4. Edit `FRONTEND_URL` variable
5. Change to: `https://YOUR-VERCEL-URL.vercel.app`
6. Save (auto-redeploys in 1-2 min)
7. Hard refresh frontend (Ctrl+Shift+R)

---

## Phase 4: Test End-to-End (15 minutes)

### Test 1: Health Check
```bash
curl https://YOUR-BACKEND-URL.koyeb.app/api/health
```
✅ Should return: `{"status":"ok"}`

### Test 2: Frontend Loads
1. Visit your Vercel URL
2. Open DevTools (F12) → Console
3. ✅ No CORS errors
4. ✅ Site loads correctly

### Test 3: Registration
1. Fill out registration form
2. Submit
3. ✅ Should see success message
4. ✅ Check Supabase for new student record

### Test 4: Start Session
1. Click to start training
2. Answer cognitive coach questions
3. ✅ Should transition to scenario
4. ✅ AI should respond

### Test 5: Verify Database
1. Go to https://supabase.com/dashboard
2. Table Editor → Session table
3. ✅ Should see new session
4. Table Editor → Message table
5. ✅ Should see conversation messages

---

## Troubleshooting

### Backend Issues

**Build fails:**
- Check Koyeb logs for specific error
- Verify all environment variables are set
- Ensure DATABASE_URL uses pooler (port 5432)

**Server won't start:**
- Check PORT is set to 8000
- Verify ANTHROPIC_API_KEY is valid
- Check logs for startup errors

**Database connection fails:**
- Use pooler URL: `...pooler.supabase.com:5432...`
- Not direct connection (port 6543)

### Frontend Issues

**Build fails:**
- Verify Root Directory is `know-thyself-frontend` ⚠️ MOST COMMON
- Check TypeScript compilation in logs
- Ensure `npm run build` works locally

**CORS errors:**
- Update FRONTEND_URL in Koyeb to match Vercel URL
- Wait for Koyeb redeploy (1-2 min)
- Hard refresh browser (Ctrl+Shift+R)

**API calls fail (404):**
- Ensure VITE_API_URL ends with `/api`
- Verify backend is running on Koyeb
- Check URL is correct

---

## Your Deployment URLs

**Fill these in after deployment:**

```
Backend (Koyeb):   https://_____________________________.koyeb.app
Frontend (Vercel): https://_____________________________.vercel.app
Database:          Supabase (unchanged)
```

**Share the Vercel URL with your students!**

---

## Auto-Deploy Setup

✅ Already configured! Every `git push` to main will:
- Auto-deploy backend to Koyeb (2-4 min)
- Auto-deploy frontend to Vercel (20-60 sec)

---

## Support

- Koyeb Docs: https://www.koyeb.com/docs
- Vercel Docs: https://vercel.com/docs
- Full migration guide: See [KNOW_THYSELF_MIGRATION_PLAN.md](KNOW_THYSELF_MIGRATION_PLAN.md)

---

**Total Cost**: $0/month on free tiers 🎉
