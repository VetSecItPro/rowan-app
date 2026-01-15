# Beta to Paid Conversion Flow

## Overview
Implemented a beta-to-paid conversion system that guides expiring beta users to upgrade their accounts instead of losing access.

## What We Built

### 1. `/upgrade` Page
**Location**: `app/upgrade/page.tsx`

A professional, conversion-focused landing page featuring:
- **Hero section** with "Ready to Keep Your Family Organized?" messaging
- **Feature highlights**: Family Spaces, All Features, Data Security
- **Pricing card** with "Coming Soon" placeholder (ready for pricing details)
- **Feature checklist**: Unlimited tasks, multiple spaces, real-time collaboration, priority support
- **Primary CTA**: "Create Your Account" button → `/signup`
- **Conversion tracking**: Automatically tracks page visits for analytics

**Key Features**:
- Clean, professional design matching Rowan's brand
- No special pricing mentions (treats all beta users equally)
- Mobile responsive
- Dark mode support
- Auto-tracks visits when accessed with `?email=` parameter

### 2. Updated Beta-Expired Page
**Location**: `app/beta-expired/page.tsx`

Changed primary call-to-action:
- ✅ **Primary button**: "Upgrade Your Account" → `/upgrade`
- ⬇️ **Secondary button**: "Return to Homepage" → `/`
- ❌ **Removed**: "Join Waitlist for Launch" button

This creates a clearer conversion funnel: Expired → Upgrade Page → Signup

### 3. Conversion Analytics
**Database**: `supabase/migrations/20251202220000_add_upgrade_tracking.sql`

Tracks who visits the upgrade page for conversion metrics:

**Tables**:
- `upgrade_page_visits` - Records each visit to `/upgrade` with email, timestamp

**Functions**:
- `track_upgrade_page_visit(email)` - Called automatically when page loads
- Creates entry in `upgrade_page_visits` table

**Analytics View**: `upgrade_conversion_stats`
```sql
SELECT * FROM upgrade_conversion_stats;
```

Shows daily metrics:
- `visit_date` - Date of visits
- `unique_visitors` - Number of unique emails
- `total_visits` - Total page views
- `conversions` - How many created accounts after visiting
- `conversion_rate_percentage` - % who converted

**Example Query**:
```sql
-- See last 7 days of conversion stats
SELECT * FROM upgrade_conversion_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY visit_date DESC;
```

### 4. Email Notification Infrastructure (Optional)
**Location**: `app/api/cron/beta-expiration-emails/route.ts`
**Migration**: `supabase/migrations/20251202210000_add_beta_expiration_notifications.sql`

Pre-built system for sending expiration warnings (currently NOT automated):

**Database Functions**:
- `get_expiring_beta_users(7)` - Returns users expiring in 7 days
- `get_expiring_beta_users(3)` - Returns users expiring in 3 days
- `has_expiration_notification_sent(email, type)` - Prevents duplicate emails
- `record_expiration_notification(email, type)` - Marks email as sent

**Email Templates**:
- **7-day warning**: Professional reminder with upgrade link
- **3-day warning**: Urgent "final reminder" with countdown

**To Manually Send Emails**:
You can manually trigger the email endpoint:
```bash
curl -X GET https://rowan.app/api/cron/beta-expiration-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## User Journey Flow

```
Beta User's Access Expires
         ↓
Middleware detects expiration
         ↓
Auto sign-out + redirect to /beta-expired
         ↓
User sees: "Beta Access Expired"
         ↓
Clicks: "Upgrade Your Account"
         ↓
Lands on /upgrade page
         ↓
[Visit tracked in database]
         ↓
Reads features & benefits
         ↓
Clicks: "Create Your Account"
         ↓
Redirected to /signup
         ↓
User creates paid account
         ↓
[Conversion tracked in analytics]
```

## SQL Queries for Managing Beta Users

### View All Expiring Users
```sql
-- See all beta users and their expiration status
SELECT * FROM admin_beta_users_status
ORDER BY access_expires_at ASC;
```

### Get Users Expiring Soon
```sql
-- Users expiring in next 7 days
SELECT * FROM get_expiring_beta_users(7);

-- Users expiring in next 3 days
SELECT * FROM get_expiring_beta_users(3);
```

### Check Conversion Metrics
```sql
-- Daily conversion statistics
SELECT * FROM upgrade_conversion_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY visit_date DESC;

-- Overall conversion rate
SELECT
  COUNT(DISTINCT email) as total_visitors,
  COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN upv.email END) as conversions,
  ROUND(
    (COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN upv.email END)::NUMERIC /
     NULLIF(COUNT(DISTINCT upv.email), 0)) * 100,
    2
  ) as conversion_rate
FROM upgrade_page_visits upv
LEFT JOIN auth.users u ON u.email = upv.email AND u.created_at > upv.visited_at;
```

### Extend Beta Access (if needed)
```sql
-- Add 15 more days to a user's beta access
SELECT extend_beta_access('request-uuid-here', 15);
```

## Testing the Flow

### 1. Test Upgrade Page
Visit: `http://localhost:3000/upgrade?email=test@example.com`

Should:
- ✅ Display pricing card with "Coming Soon"
- ✅ Show feature checklist
- ✅ Track visit in database
- ✅ "Create Your Account" button works

### 2. Test Expiration Flow
```sql
-- Manually expire a beta user
UPDATE beta_access_requests
SET access_expires_at = NOW() - INTERVAL '1 day'
WHERE email = 'your-test-email@example.com';
```

Then:
1. Try to access `/dashboard`
2. Should auto-logout and redirect to `/beta-expired`
3. Click "Upgrade Your Account"
4. Should land on `/upgrade` page

### 3. Check Analytics
```sql
-- See who visited upgrade page
SELECT * FROM upgrade_page_visits
ORDER BY visited_at DESC
LIMIT 10;

-- Check conversion stats
SELECT * FROM upgrade_conversion_stats;
```

## Next Steps (When Ready)

### 1. Add Pricing Information
Edit `app/upgrade/page.tsx` around line 90:
```typescript
<div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
  $X.XX
  <span className="text-xl font-normal text-gray-500">/month</span>
</div>
```

### 2. Setup Automated Emails (Optional)
If you want automated expiration warnings:

**Add to `vercel.json`**:
```json
{
  "crons": [{
    "path": "/api/cron/beta-expiration-emails",
    "schedule": "0 9 * * *"
  }]
}
```

**Add environment variable**:
```
CRON_SECRET=your-random-secret-here
```

This will run daily at 9 AM and send:
- 7-day warnings to users expiring in 7 days
- 3-day warnings to users expiring in 3 days

### 3. Monitor Conversions
Regular queries to track performance:
```sql
-- Weekly conversion report
SELECT
  DATE_TRUNC('week', visit_date) as week,
  SUM(unique_visitors) as visitors,
  SUM(conversions) as conversions,
  ROUND(AVG(conversion_rate_percentage), 2) as avg_conversion_rate
FROM upgrade_conversion_stats
GROUP BY week
ORDER BY week DESC;
```

## Files Changed/Created

### New Files
- `app/upgrade/page.tsx` - Upgrade landing page
- `app/api/cron/beta-expiration-emails/route.ts` - Email notification API (optional)
- `supabase/migrations/20251202210000_add_beta_expiration_notifications.sql` - Email tracking
- `supabase/migrations/20251202220000_add_upgrade_tracking.sql` - Conversion tracking
- `BETA_UPGRADE_FLOW.md` - This documentation

### Modified Files
- `app/beta-expired/page.tsx` - Updated CTA to point to `/upgrade`

## Database Schema

### New Tables
1. **upgrade_page_visits**
   - `id` (uuid, primary key)
   - `email` (text, the visitor's email)
   - `visited_at` (timestamptz, when they visited)
   - `user_agent` (text, browser info)
   - `referrer` (text, where they came from)

2. **beta_expiration_notifications** (for optional email automation)
   - `id` (uuid, primary key)
   - `email` (text)
   - `notification_type` (text: '7_day' or '3_day')
   - `sent_at` (timestamptz)

### New Views
1. **upgrade_conversion_stats**
   - Daily aggregated conversion metrics
   - Joins visits with account creation

### New Functions
1. `track_upgrade_page_visit(email)` - Record page visit
2. `get_expiring_beta_users(days)` - Get users expiring in X days
3. `has_expiration_notification_sent(email, type)` - Check if email sent
4. `record_expiration_notification(email, type)` - Mark email as sent

## Environment Variables Needed

All existing vars are sufficient. Optional additions:

```env
# For automated email cron job (optional)
CRON_SECRET=your-random-secret-here

# Already have these:
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_APP_URL=https://rowan.app
```

## Security Notes

- ✅ Conversion tracking only stores email (no sensitive data)
- ✅ Email endpoint protected by CRON_SECRET auth header
- ✅ All database functions use SECURITY DEFINER for proper RLS
- ✅ Analytics view only accessible to authenticated users
- ✅ No user data exposed in tracking (only aggregated stats)

## Monitoring

### Key Metrics to Track
1. **Upgrade page traffic**: How many beta users visit `/upgrade`
2. **Conversion rate**: % who create accounts after visiting
3. **Time to conversion**: Days between visit and account creation
4. **Drop-off points**: Where users abandon the flow

### Weekly Check-in Query
```sql
-- This week's performance
SELECT
  COUNT(DISTINCT upv.email) as visitors,
  COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN upv.email END) as conversions,
  ROUND(
    (COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN upv.email END)::NUMERIC /
     NULLIF(COUNT(DISTINCT upv.email), 0)) * 100,
    2
  ) as conversion_rate
FROM upgrade_page_visits upv
LEFT JOIN auth.users u ON u.email = upv.email AND u.created_at > upv.visited_at
WHERE upv.visited_at >= DATE_TRUNC('week', CURRENT_DATE);
```
