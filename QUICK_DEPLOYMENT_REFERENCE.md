# Quick Deployment Reference Card

**Target Architecture**: Koyeb (backends) + Vercel (frontends)
**Monthly Cost**: $1-2

---

## 🚀 Quick Deploy Checklist

### Koyeb Backend Deployment

**URL**: https://app.koyeb.com/

**Required Settings**:
```
Repository: scaryc/know-thyself-mvp
Branch: main
Region: Frankfurt (fra)
Instance: Nano (Hobby plan - FREE)
Port: 8000

Build Command:
npm install && npx prisma generate

Run Command:
npx prisma db push --accept-data-loss --skip-generate && npm run server
```

**Environment Variables**:
```
DATABASE_URL = <from .env file>
ANTHROPIC_API_KEY = <from .env file>
NODE_ENV = production
PORT = 8000
FRONTEND_URL = <your-vercel-url>
```

---

### Vercel Frontend Deployment

**URL**: https://vercel.com/new

**Required Settings**:
```
Repository: scaryc/know-thyself-mvp
Root Directory: know-thyself-frontend
Framework: Vite (auto-detected)
Build Command: npm run build
Output Directory: dist
```

**Environment Variables**:
```
VITE_API_URL = <your-koyeb-backend-url>/api
```
⚠️ **Must end with `/api`**

---

## ✅ Verification Commands

```bash
# Test backend health
curl https://YOUR-BACKEND.koyeb.app/api/health

# Test frontend loads
curl -I https://YOUR-FRONTEND.vercel.app

# Run full health check
npm run test:production

# Check database
# Should show 48+ sessions in Supabase
```

---

## 🔗 Important URLs

**Dashboards**:
- Koyeb: https://app.koyeb.com/
- Vercel: https://vercel.com/dashboard
- Supabase: https://supabase.com/dashboard

**Your Services** (update after deployment):
```
Know Thyself Backend:  https://_____.koyeb.app
Know Thyself Frontend: https://_____.vercel.app
Trading Backend:       https://_____.koyeb.app
Trading Frontend:      https://_____.vercel.app
```

---

## 💰 Cost Tracking

| Service | Cost |
|---------|------|
| Koyeb Hobby (1 free) | $0 |
| Koyeb Starter | $1-2/month |
| Vercel Free (both) | $0 |
| **TOTAL** | **$1-2/month** |

---

## 🆘 Quick Troubleshooting

**Backend won't start**:
- Check Koyeb logs
- Verify DATABASE_URL is correct
- Ensure PORT=8000

**Frontend can't reach backend**:
- Check VITE_API_URL ends with `/api`
- Verify CORS (FRONTEND_URL set in backend)
- Check browser console for errors

**Build fails**:
- Koyeb: Check if Prisma generates correctly
- Vercel: Check TypeScript compilation

---

## 📝 One-Line Deployment Commands

**If using CLI** (optional - web UI recommended):

```bash
# Koyeb CLI (install first: npm i -g @koyeb/koyeb-cli)
koyeb service create know-thyself-backend --git scaryc/know-thyself-mvp --instance-type nano --region fra

# Vercel CLI (install first: npm i -g vercel)
cd know-thyself-frontend && vercel --prod
```

---

**Full Guide**: See `docs/Migration_To_Koyeb_Vercel.md`
