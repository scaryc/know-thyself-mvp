# 🚀 Render.com Deployment Guide

**Deploy your Know Thyself MVP completely FREE using Render.com**

This guide shows you how to deploy both frontend and backend on one platform, at zero cost, perfect for student testing.

---

## ✅ Why Render.com?

| Feature | Render.com Free Tier |
|---------|---------------------|
| **Cost** | ✅ $0 (Forever) |
| **Frontend Hosting** | ✅ FREE Static Site |
| **Backend Hosting** | ✅ FREE Web Service |
| **Automatic Deployments** | ✅ Yes (from GitHub) |
| **HTTPS/SSL** | ✅ Automatic |
| **Custom Domains** | ✅ Supported |
| **Database** | ✅ Already using Supabase |

**Perfect for educational testing with students!**

---

## ⚡ About the Free Tier

**Backend limitation:**
- Spins down after 15 minutes of inactivity
- Wakes up in ~30 seconds on first request
- **For your use case:** First student waits 30 sec, then everyone else has instant access

**Frontend:**
- Always on, no spin-down
- Students access instantly

---

## 📋 Prerequisites

Before deploying, make sure you have:

- ✅ GitHub account with your repository
- ✅ Supabase database set up (from SUPABASE_SETUP_INSTRUCTIONS.md)
- ✅ Claude API key from Anthropic
- ✅ Your changes pushed to GitHub

---

## 🚀 Deployment Steps

### Step 1: Sign Up for Render

1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Choose **"Sign in with GitHub"**
4. Authorize Render to access your repositories

**Time:** 2 minutes

---

### Step 2: Deploy Using Blueprint (Recommended)

Render can deploy both services at once using the `render.yaml` file I created.

1. On Render dashboard, click **"New +" → "Blueprint"**
2. Connect your `know-thyself-mvp` repository
3. Render will detect `render.yaml` and show both services:
   - ✅ `know-thyself-backend` (Web Service)
   - ✅ `know-thyself-frontend` (Static Site)

**Time:** 1 minute

---

### Step 3: Configure Environment Variables

Render will prompt you for required environment variables:

#### For Backend Service:

| Variable Name | Value | Where to Find |
|--------------|-------|---------------|
| `DATABASE_URL` | `postgresql://postgres:ParamedicInCompute@db...` | See SUPABASE_SETUP_INSTRUCTIONS.md:170-172 |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Your Claude API key from Anthropic |

**Note:** `PORT` and `NODE_ENV` are already set in render.yaml

#### For Frontend Service:

| Variable Name | Value |
|--------------|-------|
| `VITE_API_URL` | Leave empty for now - we'll set this after backend deploys |

**Time:** 2 minutes

---

### Step 4: Deploy!

1. Click **"Apply"** or **"Create Services"**
2. Render will build and deploy both services
3. **Backend:** Takes 3-5 minutes (npm install + Prisma generate)
4. **Frontend:** Takes 2-3 minutes (npm install + build)

You can watch the logs in real-time.

**Time:** 5 minutes

---

### Step 5: Connect Frontend to Backend

After backend deploys successfully:

1. Copy your backend URL from Render dashboard
   - Should look like: `https://know-thyself-backend.onrender.com`

2. Go to **Frontend service** → **Environment** tab

3. Update `VITE_API_URL`:
   ```
   VITE_API_URL=https://know-thyself-backend.onrender.com/api
   ```
   **Important:** Add `/api` at the end!

4. Click **"Save Changes"**

5. Frontend will automatically redeploy (1-2 minutes)

**Time:** 2 minutes

---

## 🎉 You're Live!

Your URLs will be:
- **Frontend:** `https://know-thyself-frontend.onrender.com`
- **Backend:** `https://know-thyself-backend.onrender.com`

**Share the frontend URL with your students!**

---

## 🧪 Test Your Deployment

### 1. Test Backend Health
Visit: `https://your-backend-url.onrender.com/api/health`

Should see: `{"status": "ok"}` or similar

### 2. Test Frontend Registration
1. Visit your frontend URL
2. Fill out registration form
3. Check if student is assigned Group A or B
4. Verify in Supabase Table Editor

### 3. Test Training Session
1. Start a training scenario
2. Send messages to the AI
3. Verify responses are working
4. Check session data in Supabase

### 4. Test Session Persistence
1. Start a session
2. Refresh the page
3. Should resume where you left off

---

## 🔄 Automatic Deployments

**Great news!** Render automatically redeploys when you push to GitHub.

**Your workflow:**
```bash
# Make changes locally
git add .
git commit -m "improvements"
git push

# Render auto-deploys:
# - Backend redeploys if server/ files changed
# - Frontend redeploys if know-thyself-frontend/ files changed
```

**Deployment time:** 2-5 minutes per service

---

## 🎓 Student Access Instructions

Send this to your students:

```
Dear Students,

Access the Emergency Medical Training system at:
https://know-thyself-frontend.onrender.com

Instructions:
1. Click the link above
2. Enter your name and email
3. Review and accept the consent form
4. Begin your training session

Note: If you're the first to access after a break,
please wait 30 seconds for the system to wake up.

The system will remember your progress if you need to take a break.

Best regards,
Your Instructor
```

---

## 🌍 Custom Domain (Optional)

Want to use your own domain instead of `*.onrender.com`?

1. Go to your service → **Settings** tab
2. Scroll to **Custom Domain**
3. Add your domain (e.g., `training.yourschool.edu`)
4. Follow DNS configuration instructions
5. Render provides free SSL certificate

**Cost:** Free on Render (you just need to own the domain)

---

## 💡 Keep Backend Awake (Optional)

If you don't want the 30-second wake-up delay:

### Option A: Use UptimeRobot (Free)
1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Create new monitor:
   - Type: HTTP(s)
   - URL: `https://your-backend.onrender.com/api/health`
   - Interval: 5 minutes
3. Keeps your backend awake by pinging every 5 minutes

**Cost:** FREE

### Option B: Upgrade to Render Paid Plan
- $7/month for always-on backend
- No spin-down, instant responses

---

## 🔧 Troubleshooting

### Issue: "Backend service failed to build"

**Common causes:**
- Missing dependencies in package.json
- Prisma generate failed
- Node version mismatch

**Fix:**
1. Check build logs in Render dashboard
2. Test locally: `npm install && npx prisma generate && npm run server`
3. Make sure `DATABASE_URL` is set correctly

---

### Issue: "Frontend can't connect to backend"

**Check:**
1. Is `VITE_API_URL` set in frontend environment variables?
2. Does it include `/api` at the end?
3. Is backend service running? (check Render dashboard)

**Fix:**
```bash
# Correct format:
VITE_API_URL=https://know-thyself-backend.onrender.com/api

# Wrong formats:
VITE_API_URL=https://know-thyself-backend.onrender.com  # Missing /api
VITE_API_URL=http://localhost:3001/api  # Still using localhost
```

---

### Issue: "First load is slow"

**This is expected on free tier!**
- Backend spins down after 15 min inactivity
- First request takes ~30 seconds to wake up
- After that, works normally

**Solutions:**
1. Use UptimeRobot to keep it awake (free)
2. Upgrade to paid plan ($7/month)
3. Tell students: "First login may take 30 seconds"

---

### Issue: "Prisma client errors"

**Fix:**
Make sure `DATABASE_URL` is set and `prisma generate` runs in build:

```yaml
# In render.yaml (already configured):
buildCommand: npm install && npx prisma generate
```

---

### Issue: "Environment variables not updating"

**Remember:**
- Changes require manual redeploy
- Go to service → **Manual Deploy** → **Deploy latest commit**
- Or push a new commit to trigger auto-deploy

---

## 📊 Monitor Your Deployment

### View Logs
1. Go to service in Render dashboard
2. Click **"Logs"** tab
3. See real-time logs from your application

### Check Metrics
- **Backend:** Request count, response times, CPU usage
- **Frontend:** Bandwidth usage, deploy history

### Set Up Alerts
1. Go to **Settings** → **Notifications**
2. Add email for deploy failures
3. Get notified if service goes down

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ **NEVER** commit `.env` files to GitHub
- ✅ Use Render's environment variables UI
- ✅ Different values for testing vs production
- ✅ Rotate API keys regularly

### Database
- ✅ Use Supabase connection string (includes SSL)
- ✅ Keep DATABASE_URL secret
- ✅ Enable Row Level Security in Supabase (optional)

### API Keys
- ✅ Store ANTHROPIC_API_KEY in Render environment variables
- ✅ Never expose in frontend code
- ✅ Monitor usage in Anthropic dashboard

---

## 💰 Pricing & Limits

### Free Tier Includes:

**Backend (Web Service):**
- ✅ 750 hours/month (enough for 24/7 when awake)
- ✅ Spins down after 15 min inactivity
- ✅ 512 MB RAM
- ✅ 0.1 CPU

**Frontend (Static Site):**
- ✅ 100 GB bandwidth/month
- ✅ Always on
- ✅ Free SSL
- ✅ Global CDN

**Enough for:**
- 100-200 students
- Multiple training sessions per student
- Full semester research study

**If you exceed limits:**
- Render will notify you
- Won't charge without permission
- Can upgrade to paid plan (~$7-21/month)

---

## 🚦 Development Workflow

### Local Development
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
cd know-thyself-frontend
npm run dev

# Opens at http://localhost:5173
# Backend at http://localhost:3001
```

### Test Production Build Locally
```bash
cd know-thyself-frontend
npm run build
npm run preview
```

### Deploy to Render
```bash
git add .
git commit -m "Your changes"
git push
# Render auto-deploys!
```

---

## 📱 Device Compatibility

Your deployment works on:
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile phones (iOS Safari, Android Chrome)
- ✅ Tablets (iPad, Android tablets)
- ✅ All screen sizes (responsive design)

Students can complete training on any device with internet!

---

## 📈 Scaling for Larger Studies

Current free setup handles:
- ✅ 100-200 students
- ✅ Multiple scenarios per student
- ✅ Real-time AI responses
- ✅ Concurrent sessions

**Need more?**
- **200-500 students:** Upgrade backend to $7/month (always-on)
- **500+ students:** Consider $21/month plan (1 GB RAM, more CPU)
- **High traffic:** Supabase can handle it (you're already on cloud)

---

## 🔄 Alternative: Manual Setup

If Blueprint doesn't work, deploy services manually:

### Deploy Backend Manually:

1. Click **"New +" → "Web Service"**
2. Connect repository
3. Configure:
   ```
   Name: know-thyself-backend
   Runtime: Node
   Build Command: npm install && npx prisma generate
   Start Command: npm run server
   ```
4. Add environment variables
5. Select Free plan
6. Deploy

### Deploy Frontend Manually:

1. Click **"New +" → "Static Site"**
2. Connect repository
3. Configure:
   ```
   Name: know-thyself-frontend
   Build Command: cd know-thyself-frontend && npm install && npm run build
   Publish Directory: know-thyself-frontend/dist
   ```
4. Add `VITE_API_URL` environment variable
5. Deploy

---

## 📚 Helpful Resources

- **Render Documentation:** [docs.render.com](https://docs.render.com)
- **Render Status:** [status.render.com](https://status.render.com)
- **Supabase Dashboard:** [supabase.com/dashboard](https://supabase.com/dashboard)
- **Your Project Files:**
  - `render.yaml` - Render configuration
  - `.env.example` - Environment variables template
  - `SUPABASE_SETUP_INSTRUCTIONS.md` - Database setup

---

## ✅ Deployment Checklist

Before sharing with students:

- [ ] Backend deployed successfully on Render
- [ ] Frontend deployed successfully on Render
- [ ] Environment variables set correctly
- [ ] `VITE_API_URL` points to backend + `/api`
- [ ] Backend health endpoint responds
- [ ] Test registration flow
- [ ] Test training session start
- [ ] Test AI responses
- [ ] Test session persistence (refresh page)
- [ ] Verify data appears in Supabase
- [ ] Test on mobile device
- [ ] Optional: Set up UptimeRobot to keep backend awake
- [ ] Prepare student access instructions

---

## 🎯 Quick Reference

### Your Deployment URLs
```
Frontend: https://know-thyself-frontend.onrender.com
Backend:  https://know-thyself-backend.onrender.com
API URL:  https://know-thyself-backend.onrender.com/api
```

### Environment Variables Needed

**Backend:**
- `DATABASE_URL` - From Supabase (line 170-172 in SUPABASE_SETUP_INSTRUCTIONS.md)
- `ANTHROPIC_API_KEY` - From Anthropic dashboard

**Frontend:**
- `VITE_API_URL` - Your backend URL + `/api`

### Important Files
- `render.yaml` - Defines both services
- `.env.example` - Shows required environment variables
- `server/index.js` - Backend entry point
- `know-thyself-frontend/dist` - Built frontend files

---

## 💡 Pro Tips

1. **Deploy backend first**, get its URL, then deploy frontend
2. **Watch build logs** - they show exactly what's happening
3. **Test locally first** - catch errors before deploying
4. **Use UptimeRobot** - keep backend awake during testing days
5. **Check Supabase** - verify data is being saved correctly
6. **Custom domain** - makes it look more professional for students
7. **Monitor logs** - catch issues before students report them

---

## 🆘 Get Help

**Render Issues:**
- Render Community Forum: [community.render.com](https://community.render.com)
- Render Documentation: [docs.render.com](https://docs.render.com)
- Check build logs for specific error messages

**Project Issues:**
- Review logs in Render dashboard
- Test build locally: `npm run build`
- Verify environment variables are set
- Check Supabase connection

**Common Error Messages:**

| Error | Cause | Fix |
|-------|-------|-----|
| "Port already in use" | Using wrong PORT | Set `PORT=3001` in environment |
| "Prisma client not generated" | Build command missing | Add `npx prisma generate` to build |
| "Cannot connect to database" | Wrong DATABASE_URL | Check Supabase connection string |
| "API key invalid" | Wrong ANTHROPIC_API_KEY | Verify key in Anthropic dashboard |

---

## 🎉 Success!

You now have a completely FREE, production-ready deployment:

✅ Frontend hosted on Render
✅ Backend hosted on Render
✅ Database on Supabase
✅ Automatic deployments from GitHub
✅ HTTPS/SSL enabled
✅ Ready for student testing

**Total cost: $0** 🎊

Share your frontend URL with students and start collecting data for your research!

---

**Questions?** Check the troubleshooting section or review the logs in your Render dashboard.

**Good luck with your research study!** 🚀
