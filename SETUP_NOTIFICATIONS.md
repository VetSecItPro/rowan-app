# Notification System Setup Guide

This guide explains how to set up push notifications, quiet hours enforcement, and frequency batching in the Rowan app.

## Features

1. **Push Notifications**: Browser push notifications using Web Push API
2. **Quiet Hours**: Suppress notifications during user-defined quiet hours
3. **Frequency Batching**: Hourly/daily digest emails to reduce notification fatigue
4. **Smart Queueing**: Notifications queued and sent based on preferences

## Setup Steps

### 1. Generate VAPID Keys for Push Notifications

VAPID keys are required for Web Push API. Generate them using the `web-push` package:

```bash
npx web-push generate-vapid-keys
```

This will output:

```
=======================================

Public Key:
BNj...

Private Key:
XYZ...

=======================================
```

### 2. Add Environment Variables

Add the following to your `.env.local` file:

```bash
# Push Notifications (VAPID Keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key-here"
VAPID_PRIVATE_KEY="your-private-key-here"
VAPID_EMAIL="mailto:noreply@yourdomain.com"

# Cron Job Security
CRON_SECRET="generate-a-random-secret-here"
```

**Important:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Must have `NEXT_PUBLIC_` prefix (client-side)
- `VAPID_PRIVATE_KEY` - No prefix (server-only, never exposed to client)
- `VAPID_EMAIL` - Your contact email in `mailto:` format
- `CRON_SECRET` - Random secret for securing cron endpoints

### 3. Run Database Migrations

The notification system requires three new database tables:

1. `push_subscriptions` - Stores push subscription data
2. `notification_queue` - Queues notifications for batching
3. Helper functions for quiet hours and scheduling

**Option A: Using Supabase CLI**

```bash
npx supabase db push --include-all
```

**Option B: Manual SQL Execution** (if CLI has conflicts)

Go to your Supabase dashboard → SQL Editor and run these migrations in order:

1. `supabase/migrations/20251017000040_add_push_subscriptions.sql`
2. `supabase/migrations/20251017000041_add_notification_queue.sql`
3. `supabase/migrations/20251017000042_add_notification_helper_functions.sql`

### 4. Configure Vercel Cron Job

The notification queue processor runs every 5 minutes via Vercel Cron. This is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-notifications",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Set the cron secret in Vercel:**

1. Go to your Vercel project settings
2. Environment Variables
3. Add `CRON_SECRET` with the same value as in `.env.local`

### 5. Test Push Notifications

1. Start the dev server: `npm run dev`
2. Go to Settings → Notifications
3. Enable Push Notifications (browser will request permission)
4. Toggle on specific notification types
5. Test by creating a reminder or task

## How It Works

### Notification Flow

1. **Event occurs** (e.g., reminder due, task assigned)
2. **Service checks preferences** → Is user subscribed? Are quiet hours active?
3. **Decision**:
   - **Instant + Not in quiet hours** → Send immediately (email + push)
   - **Hourly/Daily** → Queue for digest
   - **In quiet hours** → Queue until quiet hours end
4. **Cron job processes queue** every 5 minutes
5. **Notifications sent** via email/push

### Quiet Hours

When quiet hours are enabled:
- Notifications are NOT sent during quiet hours
- They are queued and sent after quiet hours end
- Example: Quiet hours 22:00-08:00 → notification at 23:00 sent at 08:00

Implementation via database function:

```sql
SELECT is_in_quiet_hours('user-id', 'space-id', NOW());
-- Returns true/false
```

### Frequency Batching

Users can choose notification frequency:

- **Instant**: Real-time (default)
- **Hourly**: Digest email every hour
- **Daily**: Daily summary at 9 AM
- **Never**: No email/push (in-app only)

Batching reduces email volume:
- 10 notifications/hour → 1 digest email with 10 items
- Significant cost savings for high-volume apps

## Database Schema

### push_subscriptions

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  space_id UUID REFERENCES spaces(id),
  endpoint TEXT UNIQUE,
  p256dh TEXT,  -- Push encryption key
  auth TEXT,    -- Push authentication secret
  device_name TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);
```

### notification_queue

```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  notification_type TEXT,
  notification_data JSONB,
  delivery_method TEXT,  -- 'instant', 'hourly', 'daily'
  scheduled_for TIMESTAMPTZ,
  status TEXT,  -- 'pending', 'sent', 'failed'
  suppressed_by_quiet_hours BOOLEAN,
  created_at TIMESTAMPTZ
);
```

## API Endpoints

### POST /api/notifications/send-push

Sends push notification to a user's subscribed devices.

**Request:**

```json
{
  "userId": "uuid",
  "title": "Notification Title",
  "bodyText": "Notification body",
  "icon": "/icon.png",
  "url": "/reminders/123",
  "tag": "reminder-due"
}
```

**Authorization:** Requires user to be authenticated and match `userId`

### GET /api/cron/process-notifications

Processes pending notifications from queue. Runs every 5 minutes.

**Authorization:** `Bearer {CRON_SECRET}` in Authorization header

## Service Workers

The service worker `/public/sw.js` handles push notifications in the background.

**Key events:**
- `push` - Receives and displays push notifications
- `notificationclick` - Handles clicks (opens app)
- `notificationclose` - Tracks dismissals

## Troubleshooting

### Push notifications not working

1. **Check browser support**
   - Chrome, Firefox, Edge support Web Push
   - Safari 16+ supports Web Push
   - iOS requires PWA mode

2. **Verify VAPID keys**
   ```bash
   # Check if keys are set
   echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
   echo $VAPID_PRIVATE_KEY
   ```

3. **Check browser console** for errors
4. **Verify service worker** is registered:
   - Open DevTools → Application → Service Workers
   - Should see `/sw.js` registered

### Quiet hours not working

1. **Check database function** exists:
   ```sql
   SELECT is_in_quiet_hours('your-user-id', NULL, NOW());
   ```

2. **Verify user preferences** are saved:
   ```sql
   SELECT * FROM user_notification_preferences WHERE user_id = 'your-user-id';
   ```

### Digest emails not sending

1. **Check cron job** is running (Vercel dashboard → Deployments → Functions)
2. **Verify CRON_SECRET** matches in Vercel and database
3. **Check notification queue**:
   ```sql
   SELECT * FROM notification_queue WHERE status = 'pending';
   ```

## Cost Optimization

### Email Cost Savings

**Before batching:**
- 1000 users × 10 notifications/day = 10,000 emails/day
- 300,000 emails/month
- Cost: ~$30-90/month (depending on provider)

**After hourly batching:**
- 1000 users × 10 digests/day = 10,000 emails/day
- 300,000 emails/month BUT each contains 6-10 notifications
- Effective reduction: 60-90% fewer individual sends

**After daily batching:**
- 1000 users × 1 digest/day = 1,000 emails/day
- 30,000 emails/month
- Cost: ~$3-9/month
- **90% cost reduction!**

### Push Notification Costs

Web Push is **completely free**! No third-party service required.

- No Pusher/FCM costs
- No message limits
- Direct browser-to-server communication

## Security Considerations

1. **VAPID keys are sensitive** - Never commit to git
2. **Cron secret** protects cron endpoint from unauthorized access
3. **RLS policies** ensure users only access their own subscriptions
4. **Service role** required for queue management

## Next Steps

1. **Email Templates**: Create HTML templates for digest emails
2. **Email Integration**: Connect with Resend for actual email sending
3. **Analytics**: Track notification open rates, dismissals
4. **A/B Testing**: Test different digest formats
5. **Smart Batching**: ML-based optimal send times per user

## Documentation

See `NOTIFICATION_SYSTEM.md` for complete API documentation and implementation details.
