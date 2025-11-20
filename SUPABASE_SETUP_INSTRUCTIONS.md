# 🚀 Supabase Setup Instructions

**Quick Start Guide - Run on Your Local Machine**

---

## ✅ What's Already Done

- ✅ Supabase account created
- ✅ Supabase project created
- ✅ Connection string configured
- ✅ Setup scripts created and pushed to git

---

## 🎯 What You Need to Do Now

Run the automated setup script on **your local computer** (not in Claude Code environment).

---

## 📝 Step-by-Step Instructions

### For Linux/Mac Users:

1. **Open Terminal**

2. **Navigate to your project:**
   ```bash
   cd /path/to/know-thyself-mvp
   ```

3. **Pull latest changes:**
   ```bash
   git pull origin claude/review-latest-changes-014JaQQmrm27RZ7hSzdyb4wF
   ```

4. **Run the setup script:**
   ```bash
   ./setup-supabase.sh
   ```

---

### For Windows Users:

1. **Open Command Prompt** (or PowerShell)

2. **Navigate to your project:**
   ```cmd
   cd C:\path\to\know-thyself-mvp
   ```

3. **Pull latest changes:**
   ```cmd
   git pull origin claude/review-latest-changes-014JaQQmrm27RZ7hSzdyb4wF
   ```

4. **Run the setup script:**
   ```cmd
   setup-supabase.bat
   ```

---

## 🤖 What the Script Does Automatically

The script will:

1. ✅ Pull latest code from git
2. ✅ Install all npm dependencies
3. ✅ Create `.env` file with your Supabase connection
4. ✅ Generate Prisma client
5. ✅ Push database schema to Supabase (creates 5 tables)
6. ✅ Verify the connection

**Total time:** ~2-3 minutes

---

## 📊 Database Tables Created

After the script runs, your Supabase database will have:

1. **Session** - Main session data (40+ fields)
2. **Message** - Conversation history
3. **VitalSignsLog** - Time-series vital signs
4. **PerformanceData** - Final performance scores
5. **Student** - Student registry

---

## 🔑 Add Your Claude API Key

After the script completes:

1. **Open:** `.env` file in your project
2. **Find:** `ANTHROPIC_API_KEY=your_api_key_here`
3. **Replace:** `your_api_key_here` with your actual Claude API key
4. **Save** the file

---

## 🧪 Test Your Setup

Start the server:

```bash
npm run server
```

You should see:
```
✅ Connected to database successfully
🚀 Know Thyself MVP Server running on http://localhost:3001
```

---

## 🌐 View Your Database

### Option 1: Supabase Dashboard
Visit: https://supabase.com/dashboard/project/barxdvlwfyvhnxodwnmh

Click "Table Editor" to see your tables in real-time!

### Option 2: Prisma Studio (Local)
```bash
npx prisma studio
```
Opens at: http://localhost:5555

---

## ❓ Troubleshooting

### Issue: "Git pull failed"
**Solution:** You might have local changes. Stash them first:
```bash
git stash
git pull origin claude/review-latest-changes-014JaQQmrm27RZ7hSzdyb4wF
git stash pop
```

### Issue: "npm install failed"
**Solution:** Check your internet connection and try again.

### Issue: "Prisma generate failed"
**Solution:** Make sure you have Node.js 18+ installed:
```bash
node --version
```

### Issue: "Database push failed"
**Solution:** Check your connection string in `.env` file. Make sure:
- Password is correct (no brackets)
- No extra spaces
- Wrapped in quotes

### Issue: "Can't connect to database"
**Solution:**
1. Check your Supabase project is active (not paused)
2. Verify your password in `.env`
3. Try resetting your database password in Supabase dashboard

---

## 📚 Your Supabase Connection Details

**Connection String:**
```
postgresql://postgres:ParamedicInCompute@db.barxdvlwfyvhnxodwnmh.supabase.co:5432/postgres
```

**Project Reference:** `barxdvlwfyvhnxodwnmh`

**Dashboard:** https://supabase.com/dashboard/project/barxdvlwfyvhnxodwnmh

---

## 🎉 What You Get After Setup

✅ **Cloud Database** - Your data is safe in Supabase
✅ **Zero Data Loss** - Automatic backups every day
✅ **20+ Students** - Can train simultaneously
✅ **Access Anywhere** - Check data from any computer
✅ **Professional Setup** - Production-ready infrastructure

---

## 📞 Need Help?

If you run into any issues:
1. Check the error message carefully
2. Look at the troubleshooting section above
3. Share the error with me and I'll help!

---

**Ready to go! Run the setup script and you'll be connected to Supabase in minutes!** 🚀
