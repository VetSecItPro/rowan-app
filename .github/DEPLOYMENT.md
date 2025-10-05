# Vercel Deployment Setup via GitHub Actions

This guide explains how to set up automatic deployments to Vercel using GitHub Actions.

## Prerequisites

- GitHub repository connected to your project
- Vercel account with project created
- Vercel CLI installed locally (optional, for getting tokens)

## Step 1: Get Your Vercel Tokens

### Option A: Using Vercel Dashboard (Recommended)

1. **Get Vercel Token:**
   - Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
   - Click "Create Token"
   - Name it: `GitHub Actions - Rowan App`
   - Set scope to your account/team
   - Copy the token immediately (you won't see it again)

2. **Get Organization ID:**
   - Go to [Vercel Account Settings](https://vercel.com/account)
   - Your Org ID is shown in the URL or settings page
   - Format: `team_xxxxxxxxxxxxx` or `user_xxxxxxxxxxxxx`

3. **Get Project ID:**
   - Already provided: `prj_JDUhvutaUVWf0QXkBEe8axFVlWvE`
   - Or find it in: Project Settings → General → Project ID

### Option B: Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Link project (run from project root)
vercel link

# Get tokens from .vercel/project.json
cat .vercel/project.json
```

## Step 2: Add GitHub Secrets

Go to your GitHub repository settings:

1. Navigate to: **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Add the following secrets:

### Required Secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VERCEL_TOKEN` | Your Vercel authentication token | `xxxxxxxxxxxxxxxxxxxxxx` |
| `VERCEL_ORG_ID` | Your Vercel organization/user ID | `team_xxxxxxxxxxxxx` |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | `prj_JDUhvutaUVWf0QXkBEe8axFVlWvE` |

### Adding Each Secret:

1. Click **"New repository secret"**
2. Name: `VERCEL_TOKEN`
3. Secret: Paste your Vercel token
4. Click **"Add secret"**
5. Repeat for `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`

## Step 3: Configure Environment Variables in Vercel

Make sure your Vercel project has all required environment variables:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **rowan-app**
3. Go to **Settings → Environment Variables**
4. Add the following variables:

### Production Environment Variables:

```bash
# Supabase (Public)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# App URL (Public)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Resend (Private)
RESEND_API_KEY=re_xxxxx

# Upstash Redis (Private)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx

# Environment
NODE_ENV=production
```

**Important:**
- Set environment for each variable: **Production**, **Preview**, **Development**
- Mark sensitive variables as **Encrypted** (Vercel does this by default)

## Step 4: Verify GitHub Actions Workflows

Two workflows have been created:

### 1. Production Deployment (`.github/workflows/deploy-production.yml`)
- **Triggers on:** Push to `main` branch
- **Deploys to:** Production environment on Vercel
- **Adds comment** to the commit with deployment URL

### 2. Preview Deployment (`.github/workflows/deploy-preview.yml`)
- **Triggers on:** Pull requests to `main` branch
- **Deploys to:** Preview environment on Vercel
- **Adds comment** to the PR with preview URL

## Step 5: Test the Deployment

### Test Production Deployment:

1. Make a change to your code
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "test: verify GitHub Actions deployment"
   git push origin main
   ```
3. Go to **Actions** tab in GitHub
4. Watch the workflow run
5. Check the commit for deployment URL comment

### Test Preview Deployment:

1. Create a new branch:
   ```bash
   git checkout -b feature/test-deployment
   ```
2. Make a change
3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify preview deployment"
   git push origin feature/test-deployment
   ```
4. Create a Pull Request on GitHub
5. Watch the workflow run
6. Check the PR for preview URL comment

## Workflow Features

### ✅ What the workflows do:

- **Automatic deployment** on push to main (production) or PR creation (preview)
- **Build optimization** using Vercel's build cache
- **Environment management** (production vs preview)
- **URL comments** posted to commits and PRs
- **Deployment summaries** in GitHub Actions

### 🔒 Security:

- All secrets stored in GitHub Secrets (encrypted)
- Vercel token has limited scope
- Environment variables managed in Vercel dashboard
- No sensitive data in workflow files

## Troubleshooting

### Error: "Missing Vercel Token"

**Solution:** Verify `VERCEL_TOKEN` is added to GitHub Secrets

```bash
# Check if secret exists in GitHub UI:
Settings → Secrets and variables → Actions
```

### Error: "Project not found"

**Solution:** Verify `VERCEL_PROJECT_ID` is correct

```bash
# Check your project ID in Vercel:
Project Settings → General → Project ID
```

### Error: "Organization not found"

**Solution:** Verify `VERCEL_ORG_ID` is correct

```bash
# Check your Org ID:
vercel whoami
# or check Vercel dashboard URL
```

### Build fails on Vercel

**Solution:** Check environment variables are set in Vercel dashboard

1. Go to Project Settings → Environment Variables
2. Verify all required vars are present
3. Check they're enabled for the right environment

### Workflow doesn't trigger

**Solution:** Check workflow file syntax and permissions

1. Go to **Settings → Actions → General**
2. Ensure **"Read and write permissions"** is enabled
3. Check workflow YAML syntax is valid

## Manual Deployment (Fallback)

If GitHub Actions fail, you can deploy manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

## Monitoring Deployments

### View Deployment Status:

- **GitHub Actions:** Repository → Actions tab
- **Vercel Dashboard:** [Vercel Deployments](https://vercel.com/dashboard)
- **Vercel CLI:** `vercel ls`

### Rollback if needed:

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click **"..."** → **"Promote to Production"**

## Best Practices

1. **Always test in preview** before merging to main
2. **Review build logs** in GitHub Actions
3. **Monitor deployment status** in Vercel dashboard
4. **Set up alerts** in Vercel for failed deployments
5. **Use environment-specific variables** (dev, preview, prod)
6. **Never commit** `.vercel` folder or secrets to git

## Next Steps

- [ ] Add Vercel secrets to GitHub repository
- [ ] Configure environment variables in Vercel
- [ ] Test production deployment
- [ ] Test preview deployment
- [ ] Set up custom domain in Vercel (optional)
- [ ] Configure deployment notifications (optional)

---

**Need help?** Check the [Vercel documentation](https://vercel.com/docs/deployments/overview) or [GitHub Actions docs](https://docs.github.com/en/actions).
