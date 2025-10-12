# Sentry Quick Start - TL;DR

## 🚀 Quick Setup (5 minutes)

### 1. Get Values from Sentry.io

| Value | Where to Find | Example |
|-------|---------------|---------|
| **DSN** | Settings → Projects → Client Keys (DSN) | `https://abc@o123.ingest.sentry.io/456` |
| **Org Slug** | Your URL: `sentry.io/organizations/HERE/` | `my-company` |
| **Project** | Top left of dashboard | `rowan-app` |
| **Auth Token** | Profile → User Settings → Auth Tokens → Create | `sntrys_abc123...` |

**Auth Token Scopes Needed:**
- ✅ `project:read`
- ✅ `project:releases`
- ✅ `org:read`

---

### 2. Add to .env.local

```bash
# Copy these lines and replace with your actual values:
NEXT_PUBLIC_SENTRY_DSN=YOUR_DSN_HERE
SENTRY_ORG=YOUR_ORG_SLUG_HERE
SENTRY_PROJECT=rowan-app
SENTRY_AUTH_TOKEN=YOUR_TOKEN_HERE
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

---

### 3. Install Package

```bash
npm install @sentry/nextjs
```

---

### 4. Test It

```bash
# Start dev server
npm run dev

# Visit in browser:
http://localhost:3000/api/test-sentry
```

**Expected:** Error message appears → Check Sentry dashboard (wait 1-2 min)

---

### 5. Build for Production

```bash
npm run build
```

**Expected:** Build succeeds, you see "Uploading source maps to Sentry"

---

## ✅ Done!

All errors in production will now automatically go to Sentry with:
- Full stack traces
- User session replays
- Performance data
- Breadcrumbs (user actions before error)

---

## 📚 Need More Help?

See **SENTRY_COMPLETE_SETUP.md** for detailed instructions and troubleshooting.
