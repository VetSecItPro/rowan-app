# Automatic Deployment Setup

This repository is configured to automatically deploy to both **Vercel** and **Supabase** when you push to the `main` branch.

## How It Works

When you commit and push to GitHub:
1. 🗃️ **Supabase migrations** are applied first
2. 🚀 **Vercel deployment** happens immediately after

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### Navigate to: `Settings → Secrets and variables → Actions → New repository secret`

### Vercel Secrets
- `VERCEL_TOKEN` - Your Vercel personal access token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### Supabase Secrets
- `SUPABASE_ACCESS_TOKEN` - Your Supabase personal access token
- `SUPABASE_DB_PASSWORD` - Your Supabase database password
- `SUPABASE_PROJECT_ID` - Your Supabase project reference ID

## How to Get These Values

### Vercel Tokens
1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Create a new token with deployment permissions
3. Find your Organization ID and Project ID in your Vercel project settings

### Supabase Tokens
1. **Access Token**: Go to [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens) and create a new token
2. **DB Password**: Found in Supabase Project Settings → Database → Connection string
3. **Project ID**: Found in Supabase Project Settings → General Settings → Reference ID (e.g., `mhqpjprmpvigmwcghpzx`)

## Testing the Deployment

After setting up the secrets, push any commit to `main`:

```bash
git add .
git commit -m "test: verify automatic deployment"
git push
```

Check the **Actions** tab in GitHub to see the deployment progress.

## Workflow File

The workflow configuration is located at `.github/workflows/deploy-production.yml`

## Troubleshooting

- If Supabase migrations fail, check that your `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` are correct
- If Vercel deployment fails, verify your `VERCEL_TOKEN` has the correct permissions
- View detailed logs in the GitHub Actions tab
