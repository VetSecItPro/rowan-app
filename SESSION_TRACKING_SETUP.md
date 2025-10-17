# Session Tracking Setup Instructions

The session tracking system has been implemented to fix the issue where active sessions were showing incorrect device and location information.

## What's Been Done

1. **Database Schema**: Created migration for `user_sessions` table
2. **API Endpoints**:
   - `POST /api/user/track-session` - Creates/updates session on login
   - `GET /api/user/sessions` - Fetches all active sessions
   - `DELETE /api/user/sessions/[sessionId]` - Revokes a specific session
3. **Service Layer**: Device detection and IP geolocation services
4. **Frontend Integration**: Settings page now displays real session data
5. **Auth Integration**: Sessions are automatically tracked on user login

## Database Migration Required

The `user_sessions` table needs to be created in your Supabase database. Due to migration tracking conflicts, please run the SQL manually:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of: `supabase/migrations/20251017000030_add_user_sessions_table.sql`
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you prefer using the CLI and want to resolve the migration conflicts:

```bash
# This will attempt to push all pending migrations
npx supabase db push --include-all
```

Note: You'll need to confirm when prompted. The command may show warnings about existing migrations, but the user_sessions table should be created successfully.

## Testing the Implementation

After running the migration:

1. **Sign out** of your account
2. **Sign in** again - this will create a new session with real device/location data
3. Go to **Settings > Security > Active Sessions**
4. You should now see:
   - Your actual device (e.g., "iMac - Chrome" instead of "MacBook Pro - Safari")
   - Your real location (Texas instead of California)
   - Accurate "last active" timestamp

## Features

- **Real Device Detection**: Parses User-Agent to identify device type, browser, OS
- **IP Geolocation**: Uses ipapi.co to determine location from IP address
- **Session Management**: View and revoke sessions remotely
- **Security**: All sessions are tied to authenticated users with RLS policies

## Troubleshooting

If sessions don't appear after login:

1. Check browser console for any errors
2. Verify the `user_sessions` table was created:
   ```sql
   SELECT * FROM user_sessions LIMIT 1;
   ```
3. Check that the session tracking API is working:
   ```bash
   # After logging in, check the network tab for:
   POST /api/user/track-session
   ```

## Migration File Location

The complete migration SQL can be found at:
```
supabase/migrations/20251017000030_add_user_sessions_table.sql
```
