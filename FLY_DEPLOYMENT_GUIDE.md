# Fly.io Backend Deployment Guide

## Overview

**Fly.io** is Railway's best free alternative with generous limits:
- ✅ 3 VMs with 256MB RAM each (FREE)
- ✅ 160GB bandwidth/month
- ✅ Automatic SSL
- ✅ Global CDN
- ✅ No credit card required for free tier

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Install Fly CLI

**Windows PowerShell**:
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**After installation, restart your terminal!**

Verify installation:
```bash
fly version
```

---

### Step 2: Create Fly.io Account

```bash
fly auth login
```

- Opens browser
- Sign up with GitHub (recommended)
- No credit card required for free tier!

---

### Step 3: Prepare Environment Variables

Create a file `.env.production` with:

```env
DATABASE_URL=your_supabase_connection_string
ANTHROPIC_API_KEY=your_anthropic_key
NODE_ENV=production
FRONTEND_URL=https://know-thyself-frontend.onrender.com
```

**Get values from**:
- DATABASE_URL: Supabase dashboard
- ANTHROPIC_API_KEY: server/.env.backup or console.anthropic.com
- FRONTEND_URL: Your Render frontend URL

---

### Step 4: Launch Fly App

From project root directory:

```bash
cd c:\Users\peter\know-thyself-mvp
fly launch
```

**Answer the prompts**:

1. **App Name**: `know-thyself-backend` (or your choice)
2. **Organization**: Select your account
3. **Region**: `ams` (Amsterdam - closest to Slovakia)
4. **PostgreSQL database?**: `No` (you have Supabase)
5. **Redis database?**: `No`
6. **Deploy now?**: `No` (we need to set env vars first)

This creates `fly.toml` config file (already prepared!).

---

### Step 5: Set Environment Variables

**Set secrets** (these are encrypted):

```bash
# Database
fly secrets set DATABASE_URL="your_supabase_connection_string_here"

# Anthropic API
fly secrets set ANTHROPIC_API_KEY="your_key_here"

# Frontend URL
fly secrets set FRONTEND_URL="https://know-thyself-frontend.onrender.com"
```

**Example**:
```bash
fly secrets set DATABASE_URL="postgresql://postgres.abc123:password@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

fly secrets set ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxxxxxxxx"
```

**Verify secrets**:
```bash
fly secrets list
```

---

### Step 6: Deploy

```bash
fly deploy
```

**What happens**:
1. Builds Docker image
2. Runs Prisma migrations
3. Deploys to Fly.io
4. Starts your backend

**Wait 2-3 minutes** for first deployment.

---

### Step 7: Get Your URL

```bash
fly info
```

Look for `Hostname`: `know-thyself-backend.fly.dev`

Your backend URL: `https://know-thyself-backend.fly.dev`

---

### Step 8: Test Backend

```bash
curl https://know-thyself-backend.fly.dev/api/health
```

Should return: `{"status":"ok"}`

Or open in browser:
```
https://know-thyself-backend.fly.dev/api/health
```

---

### Step 9: Update Render Frontend

1. Go to **Render.com** → Frontend service
2. **Environment** → Add/Update:
   ```
   VITE_API_URL=https://know-thyself-backend.fly.dev/api
   ```
3. **Save** → Render auto-redeploys

---

### Step 10: Test Full System

1. Open: `https://know-thyself-frontend.onrender.com`
2. Register student (choose Slovenčina)
3. Start session
4. ✅ AI should respond in Slovak!

---

## 📊 FREE TIER LIMITS

| Resource | Free Tier | Your Usage |
|----------|-----------|------------|
| VMs | 3 shared-cpu @ 256MB | 1 needed ✅ |
| Storage | 3GB total | ~100MB ✅ |
| Bandwidth | 160GB/month | ~5-10GB ✅ |
| Requests | Unlimited | ✅ |

**Your app easily fits in free tier!**

---

## 🛠️ USEFUL COMMANDS

### View logs
```bash
fly logs
```

### Open dashboard
```bash
fly dashboard
```

### Check status
```bash
fly status
```

### SSH into VM
```bash
fly ssh console
```

### Scale machines
```bash
# Check current scale
fly scale show

# Scale up if needed
fly scale count 1
```

### Redeploy
```bash
fly deploy
```

---

## 🔧 TROUBLESHOOTING

### Build fails

**Check**:
- Node.js version in fly.toml
- package.json has correct dependencies
- Prisma schema is valid

**Fix**:
```bash
fly logs
# Check error messages
```

### Database connection fails

**Check**:
- DATABASE_URL is set: `fly secrets list`
- Supabase database is active
- Connection string includes `?pgbouncer=true`

**Test locally**:
```bash
# Set DATABASE_URL in .env
npx prisma db push
```

### App won't start

**Check logs**:
```bash
fly logs
```

**Common issues**:
- Missing ANTHROPIC_API_KEY
- Port mismatch (must be 8080 on Fly)
- Prisma migration failed

**Fix port** (already set in fly.toml):
```toml
[env]
  PORT = "8080"
```

### CORS errors

**Add FRONTEND_URL**:
```bash
fly secrets set FRONTEND_URL="https://know-thyself-frontend.onrender.com"
```

---

## 🔄 AUTO-DEPLOY FROM GITHUB

### Option 1: Fly GitHub Integration

1. Go to https://fly.io/dashboard
2. Select your app
3. Settings → GitHub Integration
4. Connect repository: `scaryc/know-thyself-mvp`
5. Enable auto-deploy on push to `main`

### Option 2: GitHub Actions (Manual setup)

Create `.github/workflows/fly-deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Get token:
```bash
fly tokens create deploy
# Add to GitHub repo secrets as FLY_API_TOKEN
```

---

## 💰 COST

**Free Tier**: $0/month ✅

**If you exceed free tier** (unlikely):
- Shared CPU: $0.000001/second (~$2.60/month for 1 VM)
- Dedicated CPU: More expensive
- Extra bandwidth: $0.02/GB

**For your app**: Should stay free!

---

## 🆚 FLY.IO VS RAILWAY

| Feature | Fly.io Free | Railway Paid |
|---------|-------------|--------------|
| Cost | **$0** | $5+/month |
| VMs | 3 × 256MB | Better specs |
| Bandwidth | 160GB | Unlimited |
| Setup | CLI-based | Dashboard |
| Auto-deploy | ✅ | ✅ |

**Fly.io is perfect for your needs!**

---

## 📚 DOCUMENTATION

- Fly.io Docs: https://fly.io/docs/
- Node.js Guide: https://fly.io/docs/languages-and-frameworks/node/
- Pricing: https://fly.io/docs/about/pricing/

---

## ✅ CHECKLIST

- [ ] Fly CLI installed
- [ ] Logged in to Fly.io
- [ ] App launched (`fly launch`)
- [ ] Secrets set (DATABASE_URL, ANTHROPIC_API_KEY, FRONTEND_URL)
- [ ] Deployed (`fly deploy`)
- [ ] Backend health check works
- [ ] Render frontend updated with Fly backend URL
- [ ] Full system tested (register → Slovak AI responses)

---

## 🎉 SUCCESS!

Once deployed, you'll have:

✅ **Frontend**: Render.com (free)
✅ **Backend**: Fly.io (free)
✅ **Database**: Supabase (free)
✅ **Total cost**: $0/month
✅ **Auto-deploy**: From GitHub
✅ **Slovak support**: 100% working

Congratulations! 🚀
