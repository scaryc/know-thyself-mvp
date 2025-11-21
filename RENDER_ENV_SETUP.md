# 🔐 Render Environment Variables Setup

Quick reference for configuring environment variables in Render.com

---

## 📋 Required Environment Variables

### Backend Service (`know-thyself-backend`)

| Variable | Description | Example Value | Where to Get It |
|----------|-------------|---------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string to Supabase | `postgresql://postgres:YourPassword@db.xxx.supabase.co:5432/postgres` | SUPABASE_SETUP_INSTRUCTIONS.md line 170-172 |
| `ANTHROPIC_API_KEY` | Your Claude API key | `sk-ant-api03-...` | [Anthropic Console](https://console.anthropic.com) |
| `PORT` | Server port (auto-set in render.yaml) | `3001` | Already configured |
| `NODE_ENV` | Environment mode (auto-set in render.yaml) | `production` | Already configured |

### Frontend Service (`know-thyself-frontend`)

| Variable | Description | Example Value | When to Set |
|----------|-------------|---------------|-------------|
| `VITE_API_URL` | Backend API endpoint | `https://know-thyself-backend.onrender.com/api` | After backend deploys |

---

## 🚀 How to Set Environment Variables in Render

### During Initial Deployment (Blueprint)

1. When you create services from `render.yaml`, Render will prompt you
2. Fill in the required values:
   - `DATABASE_URL` - Paste your Supabase connection string
   - `ANTHROPIC_API_KEY` - Paste your Claude API key
3. Leave `VITE_API_URL` empty initially (set after backend deploys)

### After Deployment

1. Go to your service in Render dashboard
2. Click **"Environment"** tab on the left
3. Click **"Add Environment Variable"**
4. Enter key and value
5. Click **"Save Changes"**
6. Service will automatically redeploy

---

## 📝 Step-by-Step: Setting Environment Variables

### Step 1: Get Your Supabase DATABASE_URL

**Option A: From SUPABASE_SETUP_INSTRUCTIONS.md**

Open `SUPABASE_SETUP_INSTRUCTIONS.md` and look at lines 170-172:

```
Connection String:
postgresql://postgres:ParamedicInCompute@db.barxdvlwfyvhnxodwnmh.supabase.co:5432/postgres
```

**Option B: From Supabase Dashboard**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"Settings"** (gear icon)
4. Click **"Database"**
5. Scroll to **"Connection string"** → **"URI"**
6. Copy the full connection string
7. Replace `[YOUR-PASSWORD]` with your actual password

---

### Step 2: Get Your Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign in to your account
3. Click **"API Keys"**
4. Copy your existing key, or create a new one
5. It should start with `sk-ant-api03-...`

---

### Step 3: Add Variables to Backend Service

1. In Render dashboard, go to **`know-thyself-backend`** service
2. Click **"Environment"** tab
3. Add these variables:

```
DATABASE_URL
postgresql://postgres:ParamedicInCompute@db.barxdvlwfyvhnxodwnmh.supabase.co:5432/postgres

ANTHROPIC_API_KEY
sk-ant-api03-your-key-here
```

4. Click **"Save Changes"**
5. Wait for service to redeploy (3-5 minutes)

---

### Step 4: Get Backend URL

After backend finishes deploying:

1. Go to your **`know-thyself-backend`** service
2. Look at the top - you'll see the URL
3. Should be: `https://know-thyself-backend.onrender.com`
4. **Copy this URL** - you'll need it for the frontend

---

### Step 5: Add VITE_API_URL to Frontend

1. Go to **`know-thyself-frontend`** service
2. Click **"Environment"** tab
3. Add:

```
VITE_API_URL
https://know-thyself-backend.onrender.com/api
```

⚠️ **Important:** Add `/api` at the end!

4. Click **"Save Changes"**
5. Frontend will automatically redeploy (2-3 minutes)

---

## ✅ Verify Environment Variables

### Check Backend Environment Variables

1. Go to **`know-thyself-backend`** service
2. Click **"Environment"** tab
3. You should see:
   - ✅ `DATABASE_URL` (value hidden)
   - ✅ `ANTHROPIC_API_KEY` (value hidden)
   - ✅ `PORT` = `3001`
   - ✅ `NODE_ENV` = `production`

### Check Frontend Environment Variables

1. Go to **`know-thyself-frontend`** service
2. Click **"Environment"** tab
3. You should see:
   - ✅ `VITE_API_URL` = `https://know-thyself-backend.onrender.com/api`

---

## 🔧 Common Issues

### Issue: "Cannot connect to database"

**Cause:** Wrong `DATABASE_URL`

**Fix:**
1. Check your Supabase connection string
2. Make sure password has no brackets: `[PASSWORD]`
3. Verify format:
   ```
   postgresql://postgres:YourPassword@db.xxx.supabase.co:5432/postgres
   ```

---

### Issue: "Anthropic API error"

**Cause:** Wrong or missing `ANTHROPIC_API_KEY`

**Fix:**
1. Verify key in [Anthropic Console](https://console.anthropic.com)
2. Make sure it starts with `sk-ant-api03-`
3. Copy the full key (they're long!)
4. Check for extra spaces before/after

---

### Issue: "Frontend can't reach backend"

**Cause:** Wrong `VITE_API_URL`

**Fix:**
1. Make sure it points to your backend URL
2. Must include `/api` at the end:
   - ✅ `https://know-thyself-backend.onrender.com/api`
   - ❌ `https://know-thyself-backend.onrender.com`
   - ❌ `http://localhost:3001/api`
3. Use `https://` not `http://`

---

### Issue: "Environment variables not updating"

**Cause:** Need to redeploy after changing variables

**Fix:**
1. After saving environment variables, Render auto-redeploys
2. Wait 2-5 minutes for deployment to complete
3. Check logs to see if deployment succeeded
4. If needed, manually trigger: **"Manual Deploy"** → **"Deploy latest commit"**

---

## 🔐 Security Best Practices

### Do's ✅
- ✅ Use Render's environment variables UI (values are encrypted)
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use different API keys for development and production
- ✅ Rotate keys regularly
- ✅ Monitor API usage in Anthropic dashboard

### Don'ts ❌
- ❌ Never commit `.env` files to GitHub
- ❌ Never hardcode API keys in source code
- ❌ Never share API keys in chat/email
- ❌ Never expose `DATABASE_URL` in frontend code
- ❌ Never commit `render.yaml` with actual secrets (use sync: false)

---

## 📊 Environment Variables by Service

### Summary Table

| Service | Variable | Required? | Set When | Value Type |
|---------|----------|-----------|----------|------------|
| Backend | `DATABASE_URL` | ✅ Yes | Initial deploy | Secret |
| Backend | `ANTHROPIC_API_KEY` | ✅ Yes | Initial deploy | Secret |
| Backend | `PORT` | Auto-set | N/A | `3001` |
| Backend | `NODE_ENV` | Auto-set | N/A | `production` |
| Frontend | `VITE_API_URL` | ✅ Yes | After backend deploys | Public |

---

## 🧪 Test Your Configuration

### Test Backend Connection

1. Visit: `https://your-backend.onrender.com/api/health`
2. Should see: `{"status": "ok"}` or similar response
3. If error, check logs for database/API key issues

### Test Frontend Connection

1. Visit: `https://your-frontend.onrender.com`
2. Open browser DevTools (F12) → **Console** tab
3. Should not see API connection errors
4. Try registering a student - should work!

---

## 💡 Pro Tips

1. **Copy from SUPABASE_SETUP_INSTRUCTIONS.md** - Your DATABASE_URL is already there
2. **Test locally first** - Make sure environment variables work on localhost
3. **Use .env.example** - As a reference for required variables
4. **Watch build logs** - They'll show environment variable errors
5. **Backend first, frontend second** - Always deploy backend, get URL, then configure frontend

---

## 📚 Related Documentation

- **DEPLOYMENT.md** - Full deployment guide
- **SUPABASE_SETUP_INSTRUCTIONS.md** - Database setup and connection string
- **.env.example** - Local development environment template
- **render.yaml** - Service configuration with environment variable placeholders

---

## 🆘 Still Having Issues?

1. **Check Render logs** - Service → Logs tab
2. **Verify Supabase** - Dashboard → Project Settings → Database
3. **Test Anthropic key** - Make a test API call locally
4. **Review error messages** - Usually tell you exactly what's wrong

---

**Ready to deploy?** Follow the main guide in **DEPLOYMENT.md**!
