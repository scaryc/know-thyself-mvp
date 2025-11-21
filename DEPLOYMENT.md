# 🚀 Vercel Deployment Guide

Complete guide to deploy your Know Thyself MVP to Vercel for student testing.

---

## 📋 Prerequisites

Before deploying, make sure you have:
- ✅ GitHub account with your repository
- ✅ Supabase database already set up (from SUPABASE_SETUP_INSTRUCTIONS.md)
- ✅ Backend server deployed (see Backend Deployment section below)

---

## 🎯 Quick Start: Deploy Frontend to Vercel

### Step 1: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your repositories

**Time:** 2 minutes

---

### Step 2: Import Your Project

1. On Vercel dashboard, click **"Add New..." → "Project"**
2. Find and select your `know-thyself-mvp` repository
3. Click **"Import"**

**Time:** 1 minute

---

### Step 3: Configure Build Settings

Vercel will auto-detect your Vite project. Verify these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `know-thyself-frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

If needed, click **"Edit"** next to Root Directory and select `know-thyself-frontend`.

**Time:** 1 minute

---

### Step 4: Add Environment Variables

⚠️ **IMPORTANT:** Add your backend API URL

1. Scroll to **"Environment Variables"** section
2. Add the following variable:

```
Name:  VITE_API_URL
Value: https://your-backend-url.com/api
```

Replace `your-backend-url.com` with your actual backend deployment URL.

💡 **Don't have a backend deployed yet?** See "Backend Deployment Options" section below.

**Time:** 1 minute

---

### Step 5: Deploy!

1. Click **"Deploy"**
2. Wait for build to complete (1-2 minutes)
3. You'll get a URL like: `https://know-thyself-mvp.vercel.app`

🎉 **Done!** Your frontend is now live.

---

## 🔗 Share with Students

After deployment, students can access your app at:

```
https://your-app-name.vercel.app
```

**No localhost needed!** Students can access from any device with internet.

---

## 🖥️ Backend Deployment Options

Your frontend needs a backend API. Here are your options:

### Option A: Deploy Backend to Railway (Recommended)

**Best for:** Simple deployment, includes database support

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project" → "Deploy from GitHub repo"**
4. Select your `know-thyself-mvp` repository
5. Set root directory to your backend folder
6. Add environment variables:
   - `DATABASE_URL` (your Supabase connection string)
   - `ANTHROPIC_API_KEY` (your Claude API key)
   - `PORT=3001`
7. Deploy

Railway will give you a URL like: `https://your-app.railway.app`

**Cost:** $5/month credit (usually enough for testing)

---

### Option B: Deploy Backend to Render

**Best for:** Free tier available

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click **"New" → "Web Service"**
4. Connect your repository
5. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm run server`
6. Add environment variables (same as Railway)

**Cost:** Free tier available (spins down after inactivity)

---

### Option C: Deploy Backend to Heroku

1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Run:
```bash
heroku create your-app-name
heroku config:set DATABASE_URL="your-supabase-url"
heroku config:set ANTHROPIC_API_KEY="your-key"
git push heroku main
```

---

## 🔄 Automatic Deployments

**Great news!** Vercel automatically redeploys when you push to GitHub.

**Workflow:**
```
1. Make changes locally
2. git add . && git commit -m "your message"
3. git push
4. Vercel auto-deploys in 1-2 minutes ✨
```

You'll receive email notifications when deployments succeed or fail.

---

## 🌍 Custom Domain (Optional)

Want a custom URL instead of `*.vercel.app`?

1. Go to your project on Vercel
2. Click **"Settings" → "Domains"**
3. Add your domain (e.g., `know-thyself.yourschool.edu`)
4. Follow DNS configuration instructions

**Cost:** Free on Vercel (you just need to own the domain)

---

## 🧪 Testing Your Deployment

After deployment, test these features:

### 1. Registration Flow
- [ ] Go to your Vercel URL
- [ ] Fill out registration form
- [ ] Check if student is assigned to Group A or B
- [ ] Verify data saved in Supabase

### 2. Session Persistence
- [ ] Start a training session
- [ ] Refresh the page
- [ ] Should resume where you left off

### 3. Clear Browser Data (Testing Fresh Start)
1. Open DevTools (F12)
2. Go to **Application → Local Storage**
3. Delete `kt_*` keys
4. Refresh - should show registration again

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to backend"

**Check:**
1. Is your backend deployed and running?
2. Is `VITE_API_URL` set correctly in Vercel?
3. Does your backend URL include `/api` at the end?

**Fix:**
```bash
# Correct format:
VITE_API_URL=https://your-backend.railway.app/api
```

---

### Issue: "Build failed"

**Common causes:**
1. TypeScript errors
2. Missing dependencies
3. Wrong root directory

**Fix:**
1. Check build logs in Vercel dashboard
2. Test build locally: `npm run build`
3. Verify root directory is set to `know-thyself-frontend`

---

### Issue: "Environment variables not working"

**Remember:**
- Vite requires prefix: `VITE_` (not just `API_URL`)
- Changes require redeployment
- Use `import.meta.env.VITE_API_URL` in code

---

## 📊 Monitor Usage

Vercel provides analytics:

1. Go to your project dashboard
2. Click **"Analytics"**
3. See:
   - Number of visitors
   - Page load times
   - Geographic distribution

Perfect for tracking student participation!

---

## 💰 Pricing & Limits (Free Tier)

**Vercel Free Tier includes:**
- ✅ 100 GB bandwidth/month
- ✅ Unlimited projects
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Analytics

**Enough for:**
- ~100-200 students using the system
- Multiple training sessions per student
- Full research study

If you exceed limits, Vercel will notify you (but won't charge without permission).

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ **NEVER** commit `.env` files to git
- ✅ Use Vercel's environment variables UI
- ✅ Different values for development vs production

### Database
- ✅ Your Supabase credentials are in backend only
- ✅ Frontend only stores student IDs (no sensitive data)
- ✅ All API calls go through your backend

---

## 🚦 Development Workflow

### Local Development
```bash
cd know-thyself-frontend
npm run dev
# Opens at http://localhost:5173
```

### Production Testing
```bash
# Build locally to test production build
npm run build
npm run preview
```

### Deploy to Vercel
```bash
git add .
git commit -m "Your changes"
git push
# Vercel auto-deploys!
```

---

## 📱 Mobile Access

Your Vercel deployment works on:
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile phones (iOS Safari, Android Chrome)
- ✅ Tablets

Students can complete training on any device!

---

## 🎓 Student Access Instructions

Send this to your students:

```
Dear Students,

Access the Emergency Medical Training system at:
https://know-thyself-mvp.vercel.app

Instructions:
1. Click the link above
2. Enter your name and email
3. Review and accept the consent form
4. Begin your training session

The system will remember your progress if you need to take a break.

Best regards,
Your Instructor
```

---

## 📈 Scaling for Larger Studies

Current setup handles:
- ✅ 100-200 concurrent students
- ✅ Multiple scenarios per student
- ✅ Real-time AI responses

**Need more?**
- Upgrade Vercel plan (~$20/month for 1TB bandwidth)
- Optimize backend with caching
- Use Cloudflare Pages (unlimited bandwidth)

---

## 🆘 Need Help?

**Vercel Issues:**
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)

**Project Issues:**
- Check build logs in Vercel dashboard
- Test locally first: `npm run build`
- Verify environment variables

---

## ✅ Deployment Checklist

Before sending link to students:

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed (Railway/Render/Heroku)
- [ ] `VITE_API_URL` set in Vercel
- [ ] Supabase database connected
- [ ] Test registration flow
- [ ] Test training session
- [ ] Test session persistence
- [ ] Verify data in Supabase
- [ ] Test on mobile device
- [ ] Prepare student instructions

---

## 🎉 You're Ready!

Your Know Thyself MVP is now deployed and ready for student testing. Students can access it from anywhere, and all their data will be safely stored in your Supabase database.

**Next Steps:**
1. Test all features yourself
2. Do a pilot test with 1-2 students
3. Review data in Supabase dashboard
4. Roll out to full class

Good luck with your research! 🚀
