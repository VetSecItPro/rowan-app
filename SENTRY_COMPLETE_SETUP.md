# Complete Sentry Setup Guide

## ✅ What's Already Done

The following files have been created and configured:
- ✅ `sentry.client.config.ts` - Client-side Sentry configuration
- ✅ `sentry.server.config.ts` - Server-side Sentry configuration
- ✅ `sentry.edge.config.ts` - Edge runtime Sentry configuration
- ✅ `instrumentation.ts` - Next.js instrumentation for Sentry
- ✅ `next.config.mjs` - Updated with Sentry webpack plugin
- ✅ `app/error.tsx` - Updated to capture errors with Sentry
- ✅ `app/api/test-sentry/route.ts` - Test endpoint to verify Sentry
- ✅ `.env.local.example` - Template showing all required variables

## 📋 Step-by-Step: Complete the Setup

### Step 1: Get Your Sentry Configuration Values

Go to your Sentry dashboard at **https://sentry.io**

#### 1️⃣ Get Your DSN (Data Source Name)

**Method 1 - Quick Start (if you just created account):**
- Look for "Configure SDK" screen
- Copy the DSN that looks like: `https://abc123@o123456.ingest.sentry.io/456789`

**Method 2 - From Settings:**
1. Click **Settings** (gear icon in left sidebar)
2. Click **Projects**
3. Click your project name (probably "rowan-app")
4. Click **Client Keys (DSN)** in the left menu
5. Copy the **DSN** value

**Example DSN:**
```
https://examplePublicKey@o0000000000000.ingest.sentry.io/0000000000000
```

---

#### 2️⃣ Get Your Organization Slug

**Method 1 - From URL:**
- Look at your browser URL bar
- It will be: `https://sentry.io/organizations/YOUR-ORG-SLUG/`
- Copy the `YOUR-ORG-SLUG` part

**Method 2 - From Settings:**
1. Click **Settings** (gear icon)
2. Click **General Settings**
3. Look for "Organization Slug"

**Example:**
```
my-organization
```

---

#### 3️⃣ Get Your Project Name

**Method 1 - From Dashboard:**
- Look at the top left of Sentry dashboard
- Your project name is displayed there

**Method 2 - From Settings:**
1. Click **Settings**
2. Click **Projects**
3. Your project name is listed

**Common project names:**
- `rowan-app`
- `javascript-nextjs`
- Your custom name

---

#### 4️⃣ Generate an Auth Token (for source maps)

1. Click your **profile icon** (bottom left corner)
2. Click **User Settings**
3. Click **Auth Tokens** in the left menu
4. Click **Create New Token** button
5. Fill in the form:
   - **Name:** "Rowan App Source Maps"
   - **Scopes:** Check these three boxes:
     - ✅ `project:read`
     - ✅ `project:releases`
     - ✅ `org:read`
6. Click **Create Token**
7. **IMPORTANT:** Copy the token NOW - you won't see it again!

**Example token:**
```
sntrys_eyJpYXQiOjE2MzQwNzA0MDAsImV4cCI6MTYzNDA3MDQwMCwidXNlciI6IjEyMzQ1In0
```

---

### Step 2: Add Values to .env.local

1. Open your `.env.local` file (or create it if it doesn't exist)
2. Add these lines with your actual values:

```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=rowan-app
SENTRY_AUTH_TOKEN=sntrys_YOUR_ACTUAL_TOKEN_HERE
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

**Example filled in:**
```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o987654321.ingest.sentry.io/1234567890
SENTRY_ORG=my-startup
SENTRY_PROJECT=rowan-app
SENTRY_AUTH_TOKEN=sntrys_eyJpYXQiOjE2MzQwNzA0MDAsImV4cCI6MTYzNDA3MDQwMCwidXNlciI6IjEyMzQ1In0
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

---

### Step 3: Install Sentry Package

Run this command in your terminal:

```bash
npm install @sentry/nextjs --save
```

**If you get an error:**
```bash
# Try clearing cache first
rm -rf node_modules package-lock.json
npm install
```

---

### Step 4: Verify Installation

Check that Sentry is in your package.json:

```bash
cat package.json | grep sentry
```

You should see:
```json
"@sentry/nextjs": "^8.x.x"
```

---

### Step 5: Test Sentry Integration

#### Option 1: Test Endpoint

1. Start your development server:
```bash
npm run dev
```

2. Visit the test endpoint:
```
http://localhost:3000/api/test-sentry
```

3. You should see an error message
4. Check your Sentry dashboard - the error should appear within 1-2 minutes

#### Option 2: Manual Test in Code

Add this to any page temporarily:

```typescript
import * as Sentry from '@sentry/nextjs';

// Click this button to test
<button onClick={() => {
  Sentry.captureException(new Error('Test error from browser!'));
  alert('Error sent to Sentry!');
}}>
  Test Sentry
</button>
```

---

### Step 6: Build for Production

```bash
npm run build
```

If the build succeeds, Sentry is properly configured! ✅

During the build, you might see:
```
[Sentry] Info: Uploading source maps to Sentry
```

This means source maps are being uploaded (only in production builds).

---

## 🎯 What Happens Now

### In Development (npm run dev):
- ❌ Errors are logged to console
- ❌ NOT sent to Sentry (saves your quota)
- ✅ You can test by setting `NODE_ENV=production`

### In Production (npm run build + npm start):
- ✅ All errors automatically sent to Sentry
- ✅ Source maps uploaded for better stack traces
- ✅ Session replay enabled for 10% of sessions
- ✅ 100% of error sessions recorded

---

## 📊 Understanding Your Sentry Dashboard

After deploying, you'll see:

**Issues Tab:**
- All errors grouped by similarity
- Click an issue to see stack trace, user info, breadcrumbs

**Performance Tab:**
- Slow API calls, page loads
- Transaction traces

**Replays Tab:**
- Video-like recordings of user sessions with errors

---

## 🔧 Customizing Sentry

### Change Sample Rates

Edit `sentry.client.config.ts`:

```typescript
// Current: 10% of transactions, 10% of sessions
tracesSampleRate: 0.1,  // Change to 0.5 for 50%
replaysSessionSampleRate: 0.1,  // Change to 0.2 for 20%
```

### Add User Context

In your auth context or any component:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});
```

### Add Custom Tags

```typescript
Sentry.setTag('feature', 'tasks');
Sentry.setTag('space_id', spaceId);
```

### Manual Error Capturing

```typescript
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      operation: 'create-task',
      critical: true,
    },
    extra: {
      taskData: data,
    },
  });
}
```

---

## 🆘 Troubleshooting

### Errors not appearing in Sentry?

1. Check `.env.local` has correct DSN
2. Verify `NODE_ENV=production` (Sentry is disabled in development)
3. Check Sentry dashboard "Settings → Projects → Client Keys" - is key active?
4. Check browser network tab - do you see requests to `ingest.sentry.io`?

### Source maps not uploading?

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Verify `SENTRY_ORG` and `SENTRY_PROJECT` match exactly
3. Check auth token has `project:releases` scope
4. Run `npm run build` - look for Sentry upload messages

### Build errors?

1. Make sure `@sentry/nextjs` is installed
2. Check `next.config.mjs` syntax is correct
3. Try: `rm -rf .next && npm run build`

---

## ✅ Setup Complete Checklist

- [ ] DSN added to `.env.local`
- [ ] Organization slug added to `.env.local`
- [ ] Project name added to `.env.local`
- [ ] Auth token generated and added to `.env.local`
- [ ] `@sentry/nextjs` installed via npm
- [ ] Test endpoint returns error: `http://localhost:3000/api/test-sentry`
- [ ] Error appears in Sentry dashboard
- [ ] Production build succeeds
- [ ] Source maps uploaded during build

---

## 🎉 You're Done!

Sentry is now capturing all production errors automatically. You'll get:
- Detailed error reports
- Stack traces with source maps
- User session replays when errors occur
- Performance monitoring
- Real-time alerts

**Next steps:**
1. Set up Slack/email notifications in Sentry settings
2. Create alert rules for critical errors
3. Integrate with your GitHub for automatic issue creation

**Questions?**
- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry Discord: https://discord.gg/sentry
