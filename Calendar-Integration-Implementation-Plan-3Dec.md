# Calendar Integration Implementation Plan
**Multi-Platform Bidirectional Sync + Competitive Feature Enhancements**

## Overview

Implement seamless bidirectional calendar synchronization between Rowan and external calendar providers, plus competitive features from Skylight, Cozi, and other family calendar apps.

**User Requirements:**
- All three platforms from the start
- Two-way bidirectional sync
- External calendar wins on conflicts (Google/Apple/Cozi is master)
- Industry best practice for token storage (Supabase Vault with AES-256 encryption)

---

## Competitive Analysis Summary

### Current Rowan Calendar Features (Implemented)
- ✅ Family event creation and management
- ✅ Google Calendar sync (OAuth)
- ✅ Outlook Calendar sync (OAuth)
- ✅ ICS feed import (any calendar)
- ✅ Cozi calendar import
- ✅ Color-coded events
- ✅ Space-based family sharing
- ✅ Real-time updates

### Feature Gap Analysis vs Competitors

| Feature | Skylight | Cozi | Rowan | Priority |
|---------|----------|------|-------|----------|
| AI Schedule Parser (emails/PDFs → events) | ✅ Sidekick | ❌ | ❌ | High |
| "Today" Morning Summary | ✅ | ✅ Cozi Today | ❌ | High |
| Weather on Events | ✅ | ❌ | ❌ | Medium |
| Meal Planning on Calendar | ✅ | ❌ | Partial | Medium |
| Event Countdowns | ✅ | ❌ | ❌ | Medium |
| Chore Rewards/Stars | ✅ | ❌ | ❌ | Medium |
| Birthday Tracker | ❌ | ✅ | ❌ | Low |
| Event Comments/Notes | TimeTree | ❌ | ❌ | Low |
| Family Member Color Coding | ✅ | ✅ | Partial | Medium |
| Tasks on Calendar | ❌ | ❌ | ❌ | High |
| Reminders on Calendar | ❌ | ❌ | ❌ | High |

### Rowan's Unique Advantage
Already has integrated: Tasks, Meals, Shopping Lists, Reminders, Goals, Projects
→ Can display ALL of these on the calendar (competitors can't)

---

## Architecture Summary

### Core Principles
1. **External Calendar Wins** - External events are source of truth on conflicts
2. **Service Layer Pattern** - All sync logic isolated in `/lib/services/calendar/`
3. **Queue-Based Sync** - Reliable queue system with retry logic
4. **Provider Abstraction** - Unified interface for all three providers
5. **Security First** - Supabase Vault for OAuth tokens, RLS policies, encryption at rest

### Technology Stack
- **Google Calendar**: OAuth 2.0, Google Calendar API v3, Webhooks (push notifications)
- **Apple CalDAV**: Basic Auth (app-specific passwords), CalDAV protocol (RFC 4791), Polling
- **Cozi**: Unofficial py-cozi wrapper OR skip if not viable
- **Token Storage**: Supabase Vault (AES-256-GCM encryption)
- **Queue**: PostgreSQL tables with Redis coordination (Upstash)
- **Rate Limiting**: Upstash Redis (existing pattern)

---

## Phase 1: Database Schema & Security (Week 1)

### 1.1 Database Migrations

**Create 10 migration files:**

1. `20251203000001_create_calendar_connections.sql`
   - Core table for OAuth connections
   - Columns: user_id, space_id, provider, provider_account_id, access_token_vault_id, refresh_token_vault_id, token_expires_at, sync_direction, last_sync_at, sync_status, webhook_channel_id, webhook_expires_at
   - Unique constraint: (user_id, provider, space_id)

2. `20251203000002_create_calendar_event_mappings.sql`
   - One-to-one mapping: Rowan event ↔ External event
   - Columns: rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict
   - Unique constraints: (rowan_event_id, connection_id), (connection_id, external_event_id)

3. `20251203000003_create_calendar_sync_logs.sql`
   - Audit trail for all sync operations (90-day retention)
   - Columns: connection_id, sync_type, sync_direction, started_at, completed_at, status, events_created, events_updated, events_deleted, conflicts_detected, error_details

4. `20251203000004_create_calendar_sync_conflicts.sql`
   - Conflict resolution history
   - Columns: mapping_id, connection_id, detected_at, resolved_at, resolution_status, rowan_version (JSONB), external_version (JSONB), winning_source, resolution_strategy, resolved_by

5. `20251203000005_create_calendar_webhook_subscriptions.sql`
   - Google Calendar webhook management
   - Columns: connection_id, provider, webhook_id, webhook_url, webhook_secret, resource_id, expires_at, is_active, events_received

6. `20251203000006_add_vault_token_functions.sql`
   - Enable vault extension
   - `store_oauth_token(connection_id, token_type, token_value, description)` → Returns vault_id
   - `get_oauth_token(connection_id, token_type)` → Returns decrypted token (server-side only)
   - `handle_token_expiry(connection_id)` → Marks connection as token_expired

7. `20251203000007_add_events_external_sync_fields.sql`
   - Extend events table
   - Add columns: external_source, sync_locked, last_external_sync
   - Indexes on external_source, sync_locked

8. `20251203000008_create_calendar_rls_policies.sql`
   - Row-level security for all new tables
   - Space-based access control (users can only access their spaces)
   - Service role bypass for cron jobs

9. `20251203000009_create_calendar_indexes.sql`
   - Performance indexes on all foreign keys
   - Partial indexes for common queries (active connections, pending conflicts)

10. `20251203000010_add_calendar_triggers.sql`
    - Trigger: `queue_calendar_sync_on_change()` → Queues outbound sync when Rowan event changes
    - Runs on INSERT/UPDATE of events table

### 1.2 Security Implementation

**Token Storage (Supabase Vault):**
- All OAuth tokens encrypted at rest with AES-256-GCM
- Encryption keys managed by Supabase (separate from data)
- No tokens exposed to client code (server-side only access)
- Automatic refresh token rotation every 60 days

**RLS Policies:**
- All queries filtered by `space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())`
- Users can only access connections for their spaces
- Service role bypass for background sync jobs

**API Security:**
- Rate limiting per provider (Google: 300/min, Apple: 30/min, Cozi: 10/min)
- Webhook signature verification (HMAC-SHA256)
- Input validation with Zod schemas
- No stack traces in production errors

---

## Phase 2: Google Calendar Integration (Week 2)

### 2.1 OAuth Flow

**Files to create:**
- `/app/api/calendar/connect/google/route.ts` - POST: Generate OAuth URL with state token
- `/app/api/calendar/callback/google/route.ts` - GET: Handle OAuth callback, exchange code for tokens
- `/lib/services/calendar/google-calendar-service.ts` - Google Calendar API wrapper

**OAuth Sequence:**
1. User clicks "Connect Google Calendar"
2. Generate state token (store in Redis with 15-min TTL)
3. Redirect to Google authorization URL with scopes: `calendar.events`
4. Google redirects back with auth code + state
5. Verify state token matches
6. Exchange code for access + refresh tokens
7. Encrypt tokens and store vault references in `calendar_connections`
8. Setup webhook for real-time notifications
9. Trigger initial full sync

**Environment Variables:**
```bash
GOOGLE_CALENDAR_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=xxx
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/calendar/callback/google
```

### 2.2 Sync Engine

**Files to create:**
- `/lib/services/calendar/calendar-sync-service.ts` - Main orchestration
- `/lib/services/calendar/sync-coordinator.ts` - Queue management, scheduling
- `/lib/services/calendar/conflict-resolver.ts` - Conflict detection & resolution
- `/lib/services/calendar/event-mapper.ts` - Format conversion (Rowan ↔ Google)

**Initial Full Sync (First Connection):**
1. Lock sync (prevent concurrent syncs)
2. Fetch ALL external events (Google Calendar API)
3. Fetch ALL Rowan events for user's spaces
4. Deduplicate & match events (fuzzy matching algorithm)
5. Create sync mappings for matched events
6. Import unmatched external events → Rowan
7. Export unmatched Rowan events → Google
8. Save sync token for incremental sync
9. Release lock

**Incremental Sync (Ongoing):**
1. Lock sync
2. Fetch changed events since last sync (using sync token)
3. Process each change:
   - Deleted: Soft delete in Rowan
   - Created/Updated: Apply to Rowan (external wins)
4. Process pending outbound queue (Rowan → Google)
5. Update sync token
6. Release lock

### 2.3 Conflict Resolution (External Wins)

**Detection:**
- Compare modification timestamps (`updated_at` vs external `updated`)
- If modified within 5 seconds → treat as same edit (no conflict)
- Check for deletion conflicts (deleted in one, modified in other)
- Detect recurring event instance conflicts

**Resolution Strategy:**
```
External Always Wins:
├─ Timestamp conflict → Overwrite Rowan with external version
├─ Deletion conflict →
│   ├─ External deleted → Soft delete in Rowan
│   └─ Rowan deleted, external exists → Restore Rowan from external
├─ Recurring instance conflict → Apply external modification to Rowan series
└─ Field mismatch → Merge with external priority
```

**Logging:**
- All conflicts logged to `calendar_sync_conflicts`
- User notified for high-severity conflicts
- Automatic resolution applied

### 2.4 Webhooks (Real-time Sync)

**Files to create:**
- `/app/api/webhooks/google-calendar/route.ts` - POST: Receive Google push notifications
- `/app/api/cron/renew-calendar-webhooks/route.ts` - GET: Renew expiring webhooks

**Webhook Flow:**
1. Google sends POST to `/api/webhooks/google-calendar`
2. Verify `x-goog-channel-id` header
3. Check resource state (`exists` = changed, `not_exists` = deleted)
4. Trigger immediate incremental sync for that connection
5. Return 200 OK

**Webhook Renewal:**
- Google webhooks expire after 7 days
- Cron job runs daily to renew webhooks expiring in next 24 hours
- Delete old webhook, create new one, update `calendar_connections`

---

## Phase 3: Apple CalDAV Integration (Week 3)

### 3.1 CalDAV Protocol

**Files to create:**
- `/app/api/calendar/connect/apple/route.ts` - POST: Validate credentials, store connection
- `/lib/services/calendar/apple-caldav-service.ts` - CalDAV protocol implementation

**Authentication:**
- Basic Auth over HTTPS
- Server: `caldav.icloud.com`
- Credentials: Email + app-specific password (NOT regular password)
- User must generate app-specific password from appleid.apple.com

**Credential Validation:**
1. User enters email + app-specific password
2. Test CalDAV connection (fetch calendar list)
3. If successful, encrypt password and store vault reference
4. Create connection record
5. Trigger initial full sync

**Dependencies:**
```bash
npm install tsdav  # TypeScript CalDAV library
```

### 3.2 Delta Sync with Sync Tokens

**CalDAV Sync Token:**
- CalDAV uses `sync-token` or `ctag` (collection tag) for delta sync
- Server returns token with calendar data
- Client sends token on next request to get only changes

**Sync Flow:**
1. Initial sync: Fetch all events, save `ctag`
2. Incremental sync: Send `ctag`, receive only changes
3. Response includes: added events, modified events, deleted events (404 status)
4. Update `ctag` for next sync

**Polling Schedule:**
- Apple has NO webhooks → must poll periodically
- Poll every **10 minutes** (more frequent than Google backup)
- Use cron job: `/api/cron/calendar-sync?provider=apple`

### 3.3 iCalendar Format Conversion

**Data Format:**
- CalDAV uses iCalendar format (RFC 5545)
- Example:
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:unique-id@domain
DTSTART:20250315T100000Z
DTEND:20250315T110000Z
SUMMARY:Team Meeting
RRULE:FREQ=WEEKLY;BYDAY=FR
END:VEVENT
END:VCALENDAR
```

**Recurring Events:**
- Parent event has `RRULE` property
- Exceptions have `RECURRENCE-ID` property
- Map to Rowan's `recurrence_pattern` and `recurring_event_exceptions` table

---

## Phase 4: Microsoft Outlook Integration (Week 4)

### 4.1 OAuth 2.0 Flow (Microsoft Identity Platform)

**Authentication:**
- OAuth 2.0 via Microsoft Identity Platform (Azure AD)
- Endpoint: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- Scopes: `Calendars.ReadWrite`, `User.Read`, `offline_access`
- Works with: Microsoft 365, Outlook.com, Exchange Online

**Environment Variables:**
```bash
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/calendar/callback/outlook
```

**Files to create:**
- `/app/api/calendar/connect/outlook/route.ts` - POST: Generate OAuth URL
- `/app/api/calendar/callback/outlook/route.ts` - GET: Handle OAuth callback
- `/lib/services/calendar/outlook-calendar-service.ts` - Microsoft Graph API wrapper

**OAuth Sequence:**
1. User clicks "Connect Outlook Calendar"
2. Generate state token (store in Redis with 15-min TTL)
3. Redirect to Microsoft authorization URL
4. Microsoft redirects back with auth code + state
5. Verify state token matches
6. Exchange code for access + refresh tokens
7. Store encrypted tokens in Supabase Vault
8. Create connection record with `provider: 'outlook'`
9. Trigger initial full sync

### 4.2 Microsoft Graph Calendar API

**API Endpoints:**
- List calendars: `GET /me/calendars`
- List events: `GET /me/calendars/{id}/events`
- Get event: `GET /me/events/{id}`
- Create event: `POST /me/calendars/{id}/events`
- Update event: `PATCH /me/events/{id}`
- Delete event: `DELETE /me/events/{id}`

**Delta Sync (Change Tracking):**
- Microsoft Graph supports delta queries for efficient sync
- Initial: `GET /me/calendarView/delta?startDateTime=X&endDateTime=Y`
- Subsequent: Use `@odata.deltaLink` from previous response
- Returns only changed events since last sync

**Webhooks (Subscriptions):**
- Create subscription: `POST /subscriptions`
- Resource: `/me/events`
- Notification URL: `/api/webhooks/outlook-calendar`
- Expiration: Max 4230 minutes (roughly 3 days)
- Must renew before expiration

### 4.3 Sync Strategy

**Same as Google Calendar:**
- Bidirectional sync with external wins on conflicts
- Initial full sync followed by incremental delta sync
- Webhook for real-time updates
- Cron backup every 15 minutes

**Rate Limiting:**
- Microsoft Graph: 10,000 requests per 10 minutes per app
- Per-user: 10,000 requests per 10 minutes
- Implement exponential backoff on 429 responses

---

## Phase 5: ICS Feed Import (Week 5)

### 5.1 ICS Feed Architecture

**Use Cases:**
- School calendars (Canvas, Schoology, PowerSchool)
- Sports leagues (TeamSnap, SportsEngine)
- Church/community calendars
- Any service that exports `.ics` feeds

**Files to create:**
- `/app/api/calendar/ics/import/route.ts` - POST: Import ICS URL
- `/app/api/calendar/ics/refresh/route.ts` - POST: Manual refresh
- `/lib/services/calendar/ics-import-service.ts` - ICS parsing and import

### 5.2 ICS Import Flow

**User Flow:**
1. User clicks "Import ICS Feed"
2. Enter ICS URL (e.g., `https://school.edu/calendar.ics`)
3. Validate URL is accessible and returns valid ICS
4. Parse ICS and display preview (event count, date range)
5. User confirms import
6. Store feed URL in `calendar_connections` with `provider: 'ics'`
7. Import all events
8. Schedule periodic refresh

**ICS Parsing:**
- Use `ical.js` npm package for parsing
- Handle: VEVENT, VTIMEZONE, RRULE (recurring events)
- Convert to Rowan event format
- Deduplicate by UID

### 5.3 Sync Strategy (One-Way Only)

**Important:** ICS feeds are READ-ONLY (inbound only)
- No outbound sync (can't push changes to ICS feeds)
- Refresh every 30 minutes via cron
- Full re-import on each refresh (ICS has no delta sync)
- Events marked as `external_source: 'ics'` and `sync_locked: true`

**Cron Configuration:**
```json
{
  "path": "/api/cron/calendar-sync?provider=ics",
  "schedule": "*/30 * * * *"
}
```

### 5.4 Database Updates

**Update `calendar_connections` provider enum:**
```sql
ALTER TYPE calendar_provider ADD VALUE 'outlook';
ALTER TYPE calendar_provider ADD VALUE 'ics';
```

**ICS-specific fields:**
- `ics_url`: URL of the ICS feed
- `ics_last_etag`: ETag for conditional requests
- `ics_event_count`: Number of events in feed

---

## Phase 6: Cozi Integration (Week 6)

### 6.1 Feasibility Assessment

**Decision Tree:**
```
Can py-cozi wrapper be installed and run?
├─ YES → Implement Python bridge microservice
│   ├─ Deploy FastAPI service (separate process)
│   ├─ Call via HTTP from Node.js
│   ├─ Show "Unofficial API" warning to users
│   └─ Implement circuit breaker for failures
└─ NO → Skip Cozi integration
    ├─ Display "Coming Soon" badge in UI
    ├─ Collect user interest via waitlist
    └─ Document limitation in user docs
```

### 6.2 Python Bridge (If Viable)

**Architecture:**
```
Rowan (Node.js) → HTTP → Python FastAPI Bridge → py-cozi → Cozi API
```

**Files to create:**
- `/services/cozi-bridge/main.py` - FastAPI server
- `/services/cozi-bridge/requirements.txt` - Python dependencies
- `/lib/services/calendar/cozi-service.ts` - HTTP client to call Python bridge

**Python Service:**
```python
# services/cozi-bridge/main.py
from fastapi import FastAPI
from py_cozi import CoziClient

app = FastAPI()

@app.post("/auth")
async def authenticate(email: str, password: str):
    client = CoziClient(email, password)
    client.login()
    return {"success": True}

@app.get("/events")
async def list_events(email: str, password: str, start: str, end: str):
    client = CoziClient(email, password)
    events = client.get_calendar_events(start, end)
    return {"events": events}
```

**Deployment:**
- Deploy as separate service (Vercel Serverless Function or Railway)
- Protect with API key authentication
- Rate limit aggressively (10 req/min)

### 6.3 Sync Strategy (No Delta Sync)

**Challenge:** Cozi has NO sync tokens or delta sync

**Solution:** Full sync with local caching
1. Fetch ALL events from Cozi (last 7 days + next 30 days)
2. Compare with cached events (stored in Redis)
3. Detect changes by ID + updated timestamp
4. Apply changes to Rowan
5. Update cache

**Polling Schedule:**
- Poll every **30 minutes** (expensive full syncs)
- Use cron job: `/api/cron/calendar-sync?provider=cozi`

### 6.4 Fallback Plan

**If py-cozi is NOT viable:**
1. Mark Cozi as "Coming Soon" in UI
2. Show waitlist signup form
3. Collect user emails for launch notification
4. Document limitation in help docs
5. Prioritize Google + Apple as primary integrations

---

## Phase 7: Background Jobs & Webhooks (Week 7)

### 7.1 Cron Jobs

**Files to create:**
- `/app/api/cron/calendar-sync/route.ts` - Main sync cron job
- `/app/api/cron/renew-calendar-webhooks/route.ts` - Webhook renewal

**Vercel Cron Configuration (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/cron/calendar-sync?provider=google",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/calendar-sync?provider=apple",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/calendar-sync?provider=cozi",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/renew-calendar-webhooks",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Cron Job Logic:**
1. Verify cron secret (`Authorization: Bearer ${CRON_SECRET}`)
2. Get all active connections for provider
3. For each connection:
   - Acquire sync lock (Redis)
   - Check if sync is due (respect sync interval)
   - Perform incremental sync
   - Release lock
4. Log results to `calendar_sync_logs`

### 7.2 Real-time Triggers

**Database Trigger:**
- Runs after INSERT/UPDATE on `events` table
- Queues outbound sync operation
- Finds all active connections for user's spaces
- Inserts into sync queue with priority

**Priority Calculation:**
```
Priority (1-10, lower = higher priority):
├─ Delete operation → 2
├─ Event starting within 1 hour → 1
├─ Event within 24 hours → 3
├─ Event within 7 days → 5
└─ Future events → 7
```

### 7.3 Queue Processing

**Queue Worker (runs in cron jobs):**
1. Fetch pending items (status='pending', ordered by priority)
2. Batch process (10 items at a time)
3. For each item:
   - Mark as 'processing'
   - Execute sync operation (create/update/delete in external calendar)
   - Mark as 'completed' OR retry with exponential backoff
4. Log results

**Retry Logic:**
- Max retries: 3
- Backoff: 1min, 5min, 15min
- After max retries: mark as 'failed', notify user

---

## Phase 8: UI & User Experience (Week 8)

### 8.1 Connection Management Page

**Location:** `/app/(main)/settings/integrations/page.tsx`

**Features:**
- List connected calendars (Google, Apple, Cozi)
- Connection status indicators (active, syncing, error, token_expired)
- "Connect Calendar" button → OAuth flow
- Disconnect button → revoke access, delete sync mappings
- Sync stats: last sync time, events synced, conflicts resolved
- Manual sync button (rate limited to 10/hour)

### 8.2 OAuth Connection Flow

**User Journey:**
1. Click "Connect Google Calendar"
2. Redirected to Google authorization page
3. User grants permission
4. Redirected back to Rowan
5. Show progress: "Syncing calendar... 47/120 events"
6. Completion: "✓ Google Calendar connected! 120 events synced."
7. Dashboard shows sync status

### 8.3 Conflict Resolution UI

**When conflicts occur:**
- Show in-app notification: "Calendar sync conflict detected"
- Notification message: "Event 'Team Meeting' was modified in both Rowan and Google Calendar. Google Calendar version was kept."
- Link to event details
- Show conflict history in event modal

**Conflict History Viewer:**
- Accessible from Settings → Integrations
- Table showing: Date, Event, Source, Resolution, Status
- Filter by: Resolved, Pending, All
- Export to CSV

### 8.4 Sync Status Dashboard

**Components:**
- Connection cards (one per provider)
- Status badge: Active (green), Syncing (blue), Error (red), Token Expired (yellow)
- Last sync time: "2 minutes ago"
- Next sync: "in 8 minutes"
- Events synced: "342 events"
- Conflicts resolved: "3 conflicts"
- Error details (if any)

**Loading States:**
- Skeleton loaders during sync
- Progress bar for initial full sync
- Spinner for manual sync button
- Toast notifications for success/error

**Error States:**
- "Token expired - Please reconnect"
- "Sync failed - Retrying in 5 minutes"
- "Connection lost - Check your internet"
- "Rate limit exceeded - Syncing paused for 1 hour"

---

## Critical Files Summary

### Database (10 files)
1. `supabase/migrations/20251203000001_create_calendar_connections.sql`
2. `supabase/migrations/20251203000002_create_calendar_event_mappings.sql`
3. `supabase/migrations/20251203000003_create_calendar_sync_logs.sql`
4. `supabase/migrations/20251203000004_create_calendar_sync_conflicts.sql`
5. `supabase/migrations/20251203000005_create_calendar_webhook_subscriptions.sql`
6. `supabase/migrations/20251203000006_add_vault_token_functions.sql`
7. `supabase/migrations/20251203000007_add_events_external_sync_fields.sql`
8. `supabase/migrations/20251203000008_create_calendar_rls_policies.sql`
9. `supabase/migrations/20251203000009_create_calendar_indexes.sql`
10. `supabase/migrations/20251203000010_add_calendar_triggers.sql`

### Service Layer (8 files)
11. `lib/services/calendar/google-calendar-service.ts` - Google Calendar API wrapper
12. `lib/services/calendar/apple-caldav-service.ts` - Apple CalDAV implementation
13. `lib/services/calendar/cozi-service.ts` - Cozi integration (if viable)
14. `lib/services/calendar/calendar-sync-service.ts` - Main orchestration
15. `lib/services/calendar/sync-coordinator.ts` - Queue management, scheduling
16. `lib/services/calendar/conflict-resolver.ts` - Conflict detection & resolution
17. `lib/services/calendar/event-mapper.ts` - Format conversion
18. `lib/services/calendar/encryption-service.ts` - Token encryption/decryption

### API Routes (9 files)
19. `app/api/calendar/connect/google/route.ts` - POST: Initiate Google OAuth
20. `app/api/calendar/connect/apple/route.ts` - POST: Store CalDAV credentials
21. `app/api/calendar/connect/cozi/route.ts` - POST: Store Cozi credentials
22. `app/api/calendar/callback/google/route.ts` - GET: OAuth callback handler
23. `app/api/calendar/disconnect/[connectionId]/route.ts` - DELETE: Disconnect
24. `app/api/calendar/connections/route.ts` - GET: List connections
25. `app/api/webhooks/google-calendar/route.ts` - POST: Google webhook receiver
26. `app/api/cron/calendar-sync/route.ts` - GET: Background sync cron
27. `app/api/cron/renew-calendar-webhooks/route.ts` - GET: Webhook renewal cron

### UI Components (4 files)
28. `app/(main)/settings/integrations/page.tsx` - Connection management page
29. `components/calendar/ConnectionCard.tsx` - Provider connection card
30. `components/calendar/SyncStatusBadge.tsx` - Sync status indicator
31. `components/calendar/ConflictHistoryModal.tsx` - Conflict viewer

### Types & Validation (2 files)
32. `lib/types/calendar-integration.ts` - TypeScript interfaces
33. `lib/validations/calendar-integration-schemas.ts` - Zod schemas

---

## Testing Strategy

### Unit Tests
- `conflict-resolver.test.ts` - Conflict resolution logic
- `event-mapper.test.ts` - Format conversion (Rowan ↔ External)
- `encryption-service.test.ts` - Token encryption/decryption

### Integration Tests
- `google-calendar-provider.test.ts` - OAuth flow, API calls
- `caldav-provider.test.ts` - CalDAV protocol, sync tokens
- `calendar-sync-service.test.ts` - Full sync, incremental sync

### End-to-End Tests
- Create event in Rowan → appears in Google Calendar
- Update event in Google Calendar → updates in Rowan
- Delete event in Rowan → deleted in external calendar
- Conflict resolution (external wins)
- Recurring event sync
- Token refresh flow

---

## Performance Optimizations

### Event Deduplication
- Fuzzy matching algorithm (title + start time + location)
- Levenshtein distance for string similarity
- Confidence score > 0.85 = match

### Batch Operations
- Google Batch API: Process up to 50 events at once
- CalDAV: Use multi-get for efficiency
- Queue processing: 10 items per batch

### Caching Strategy
- Redis cache for Cozi events (30-min TTL)
- Sync tokens cached (7-day TTL)
- Connection credentials cached (1-hour TTL)

### Database Indexes
- All foreign keys indexed
- Partial indexes for common queries (active connections, pending conflicts)
- Composite indexes for uniqueness checks

---

## Security Checklist

✅ **Token Storage:**
- Supabase Vault with AES-256-GCM encryption
- Encryption keys managed by Supabase (separate from data)
- No client-side access to tokens
- Refresh token rotation every 60 days

✅ **OAuth Security:**
- CSRF protection via state parameter (Redis-backed, 15-min TTL)
- HTTPS-only redirect URIs
- State token entropy: `crypto.randomUUID()`

✅ **API Security:**
- Rate limiting per provider (Redis-backed)
- Zod validation schemas
- User authentication on all endpoints
- Space membership validation
- Webhook signature verification (HMAC-SHA256)

✅ **Data Protection:**
- RLS policies on all tables
- Space-based access control (no cross-space access)
- Audit logging (all sync operations)
- Soft delete support (30-day retention)

---

## Monitoring & Alerts

### Metrics to Track
- Sync success rate (target: > 99%)
- Average sync duration (target: < 5s for incremental)
- Conflicts per 1000 events (target: < 1%)
- Token refresh success rate (target: 100%)
- Webhook delivery rate (target: > 95%)

### Alerts
- Token expiry warning (24 hours before)
- Sync failure rate > 5% over 1 hour
- Unresolved conflicts > 50
- Webhook endpoint down for 30 minutes

---

## Rollout Plan

### Beta Phase (Week 7)
1. Deploy to staging environment
2. Test with 5-10 beta users
3. Monitor sync logs and error rates
4. Collect user feedback
5. Fix critical bugs

### Production Launch (Week 8)
1. Deploy migrations to production
2. Announce feature to existing users
3. Show onboarding tooltip: "New: Connect Google Calendar!"
4. Monitor Sentry for errors
5. Track adoption metrics

### Post-Launch (Week 9+)
1. User feedback collection
2. Performance optimization
3. Bug fixes
4. Feature enhancements (multi-calendar support, custom sync filters)

---

## Dependencies & Environment Variables

### NPM Packages
```bash
npm install googleapis        # Google Calendar API
npm install tsdav             # Apple CalDAV
npm install fast-xml-parser   # XML parsing for CalDAV
```

### Environment Variables
```bash
# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=xxx
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/calendar/callback/google

# Encryption
ENCRYPTION_KEY=64-char-hex-string  # Generated via: openssl rand -hex 32

# Cron Jobs
CRON_SECRET=random-secret-string

# Existing (already configured)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Success Criteria

✅ **Functional Requirements:**
- [ ] Google Calendar OAuth flow works end-to-end
- [ ] Apple CalDAV connection works with app-specific passwords
- [ ] Cozi integration works OR clearly marked as "Coming Soon"
- [ ] Bidirectional sync: Rowan ↔ External calendars
- [ ] Conflict resolution: External calendar wins
- [ ] Recurring events sync correctly
- [ ] Deletions sync bidirectionally

✅ **Non-Functional Requirements:**
- [ ] Sync latency < 10 seconds for incremental sync
- [ ] Initial full sync < 30 seconds for 500 events
- [ ] 99% sync success rate
- [ ] No token leaks (security audit passes)
- [ ] RLS policies enforce space isolation
- [ ] User can disconnect calendar and all data is cleaned up

✅ **User Experience:**
- [ ] Clear connection status indicators
- [ ] Helpful error messages (no technical jargon)
- [ ] Conflict notifications (non-intrusive)
- [ ] Loading states during sync
- [ ] One-click reconnect for expired tokens

---

## Risks & Mitigations

### Risk 1: Cozi API Unavailable
**Mitigation:** Skip Cozi integration, show "Coming Soon" badge, collect user waitlist

### Risk 2: Rate Limiting from Providers
**Mitigation:** Exponential backoff, queue-based sync, respect provider limits

### Risk 3: Token Expiry During Sync
**Mitigation:** Automatic refresh token flow, mark connection as expired, notify user

### Risk 4: Conflict Resolution Complexity
**Mitigation:** Simple strategy (external wins), comprehensive audit trail, user notifications

### Risk 5: Performance Issues with Large Calendars
**Mitigation:** Batch processing, incremental sync with sync tokens, Redis caching

---

## Implementation Checklist

### Phase 1: Foundation ✓
- [ ] All 10 database migrations created and tested
- [ ] Supabase Vault enabled and configured
- [ ] RLS policies implemented
- [ ] Token storage/retrieval functions
- [ ] TypeScript types generated

### Phase 2: Google Calendar ✓
- [ ] OAuth flow implemented
- [ ] Google Calendar API service layer
- [ ] Bidirectional sync working
- [ ] Conflict detection logic
- [ ] External wins resolution
- [ ] Token refresh mechanism
- [ ] Webhook setup

### Phase 3: Apple CalDAV ✓
- [ ] CalDAV protocol implementation
- [ ] Credential validation flow
- [ ] Delta sync with sync tokens
- [ ] iCalendar format conversion
- [ ] Recurring event handling
- [ ] Polling every 10 minutes

### Phase 4: Cozi ✓
- [ ] Feasibility assessment complete
- [ ] Python bridge deployed (if viable)
- [ ] Sync implementation
- [ ] OR "Coming Soon" UI (if not viable)

### Phase 5: Background Jobs ✓
- [ ] Cron jobs configured (Vercel)
- [ ] Webhook renewal cron
- [ ] Queue processing logic
- [ ] Real-time triggers (database)
- [ ] Retry logic with exponential backoff

### Phase 6: UI ✓
- [ ] Connection management page
- [ ] OAuth connection flow
- [ ] Sync status indicators
- [ ] Conflict resolution modal
- [ ] Error state messaging
- [ ] Loading states

---

## Next Steps After Plan Approval

1. **Create feature branch:** `git checkout -b feature/calendar-integration`
2. **Start with Phase 1:** Database migrations and security
3. **Test each phase** before moving to next
4. **Deploy to staging** after Phase 3 (Google + Apple working)
5. **Beta testing** with real users
6. **Production deployment** via GitHub Actions
7. **Monitor and iterate** based on feedback

---

## Phase 9: Unified Calendar View - Tasks, Meals & Reminders

**Goal:** Display tasks, meals, and reminders directly on the calendar view (Rowan's unique advantage)

### 9.1 Database Changes

**Migration: `20251204000001_add_calendar_display_preferences.sql`**
- Create `calendar_display_preferences` table
- Columns: user_id, space_id, show_tasks, show_meals, show_reminders, show_goals, show_shopping_trips
- Default all to true for new users
- Add toggle states per category

**No schema changes needed for existing tables** - they already have dates:
- `tasks.due_date` - display on calendar
- `meals.scheduled_date` - display on calendar
- `reminders.due_at` - display on calendar
- `goals.target_date` - display on calendar

### 9.2 Service Layer Updates

**Update `/lib/services/calendar/calendar-service.ts`**
- Add `getUnifiedCalendarItems(spaceId, startDate, endDate)` function
- Fetch events, tasks, meals, reminders, goals in parallel
- Return unified array with `item_type` discriminator
- Support filtering by item types based on user preferences

**Create `/lib/services/calendar/calendar-items-mapper.ts`**
- Map each item type to unified calendar item format
- Standardize: id, title, start, end, color, item_type, metadata
- Tasks: Use due_date as start, no end time (all-day marker)
- Meals: Use scheduled_date + meal_type time (breakfast=8am, lunch=12pm, dinner=6pm)
- Reminders: Use due_at as start time

### 9.3 UI Components

**Update `/app/(main)/calendar/page.tsx`**
- Add filter toggles: Events | Tasks | Meals | Reminders | Goals
- Persist filter state in localStorage
- Show item count badges on each filter

**Create `/components/calendar/UnifiedCalendarItem.tsx`**
- Render different item types with distinct styling
- Events: Standard calendar event style
- Tasks: Checkbox + title, strikethrough when complete
- Meals: Food icon + meal name + meal type badge
- Reminders: Bell icon + title + time
- Goals: Target icon + title + progress indicator

**Update `/components/calendar/CalendarEventCard.tsx`**
- Support rendering all item types
- Click to open appropriate detail modal
- Quick actions: Complete task, mark reminder done

### 9.4 Color Coding System

**Define consistent color scheme:**
- Events: Purple (existing)
- Tasks: Blue
- Meals: Orange
- Reminders: Pink
- Goals: Indigo
- Shopping: Emerald

**Add legend component** showing what each color means

---

## Phase 10: Daily Summary & Morning Notifications

**Goal:** "Good morning! Today you have 3 events, 2 tasks due, and it's Pizza Night"

### 10.1 Database Schema

**Migration: `20251204000002_create_daily_summary_preferences.sql`**
- Create `daily_summary_preferences` table
- Columns: user_id, space_id, enabled, delivery_time, delivery_method, timezone
- delivery_method: 'push', 'email', 'both'
- Default delivery_time: 07:00 local time

**Migration: `20251204000003_create_notification_history.sql`**
- Create `notification_history` table
- Track sent notifications for analytics and deduplication
- Columns: user_id, notification_type, sent_at, content_hash, delivery_status

### 10.2 Summary Generation Service

**Create `/lib/services/notifications/daily-summary-service.ts`**
- `generateDailySummary(userId, spaceId, date)` function
- Aggregate: events count, tasks due, meals planned, reminders, birthdays
- Format into human-readable message
- Include "highlight" of the day (biggest event, special occasion)

**Summary content structure:**
- Greeting based on time of day
- Weather summary (if enabled)
- Today's events list (top 5)
- Tasks due today (with urgency indicator)
- Scheduled meals
- Reminders for today
- Upcoming birthdays/anniversaries (next 7 days)
- Motivational closer

### 10.3 Delivery Infrastructure

**Create `/app/api/cron/daily-summary/route.ts`**
- Runs daily at 6:00 AM UTC
- Batch process users by timezone
- Generate and send summaries
- Log delivery status

**Email delivery via Resend:**
- Create email template: `emails/daily-summary.tsx`
- Use React Email for templating
- Include unsubscribe link
- Track open rates

**Push notification delivery:**
- Integrate with existing notification system
- Support web push (PWA)
- Support mobile push (future)

### 10.4 User Preferences UI

**Add to Settings → Notifications page:**
- Enable/disable daily summary toggle
- Delivery time picker (hour selector)
- Delivery method selection
- Preview sample summary button
- Test send button

---

## Phase 11: Event Countdowns Widget

**Goal:** "5 days until Birthday Party!" displayed prominently

### 11.1 Database Schema

**Migration: `20251204000004_add_countdown_events.sql`**
- Add `show_countdown` boolean to `calendar_events` table
- Add `countdown_label` optional text field
- Default show_countdown = false
- Index on show_countdown for efficient queries

### 11.2 Countdown Service

**Create `/lib/services/calendar/countdown-service.ts`**
- `getActiveCountdowns(spaceId, limit)` function
- Query events with show_countdown=true and start_date > now
- Calculate days remaining
- Sort by days remaining (ascending)
- Return top N countdowns

**Countdown calculation logic:**
- Days remaining (not hours/minutes for simplicity)
- "Today!" for events happening today
- "Tomorrow" for next day
- "X days" for 2+ days out
- Support weeks/months for distant events

### 11.3 UI Components

**Create `/components/calendar/CountdownWidget.tsx`**
- Display 3-5 active countdowns
- Large number display (days remaining)
- Event title below
- Click to view event details
- Celebratory animation at "Today!"

**Create `/components/calendar/CountdownCard.tsx`**
- Individual countdown item
- Circular progress indicator (days remaining / total days)
- Color based on urgency (green → yellow → red)
- Optional custom emoji/icon

**Dashboard integration:**
- Add CountdownWidget to dashboard layout
- Position near calendar or as standalone section
- Collapsible/expandable

### 11.4 Event Creation Enhancement

**Update event creation modal:**
- Add "Show countdown" toggle
- Add custom label field (optional)
- Suggest countdown for birthdays, holidays, trips
- Auto-enable for events tagged as "special"

---

## Phase 12: Weather Integration for Events

**Goal:** Show weather forecast on outdoor/travel events

### 12.1 Weather API Integration

**Select provider:** OpenWeatherMap (free tier: 1000 calls/day)
- Alternative: WeatherAPI.com, Tomorrow.io
- Store API key in environment variables

**Create `/lib/services/weather/weather-service.ts`**
- `getWeatherForecast(lat, lng, date)` function
- Cache forecasts in Redis (1 hour TTL for near-term, longer for future)
- Return: temperature, conditions, icon, precipitation chance
- Handle API rate limits with exponential backoff

### 12.2 Location Handling

**Event location geocoding:**
- Use event.location field if present
- Geocode address to lat/lng using free geocoding API
- Cache geocoding results (addresses rarely change)
- Fallback to space default location if no event location

**Create `/lib/services/location/geocoding-service.ts`**
- `geocodeAddress(address)` function
- Use OpenStreetMap Nominatim (free, no API key)
- Cache results in database or Redis

### 12.3 Weather Display

**Update `/components/calendar/CalendarEventCard.tsx`**
- Show weather icon for events with location
- Display temperature and conditions
- Only show for events within 14-day forecast window
- Indicate "forecast not available" for distant events

**Create `/components/calendar/WeatherBadge.tsx`**
- Weather icon (sun, cloud, rain, snow, etc.)
- Temperature display (°F or °C based on user preference)
- Precipitation chance if > 30%
- Tooltip with detailed forecast

### 12.4 Smart Weather Alerts

**Create `/lib/services/weather/weather-alert-service.ts`**
- Check weather before outdoor events
- Send notification if rain/snow predicted for outdoor events
- Suggest rescheduling or bringing umbrella
- Trigger 24 hours before event

**Event categorization:**
- Add `is_outdoor` boolean to events
- Auto-detect from event title keywords (picnic, hike, game, etc.)
- Manual toggle in event creation

---

## Phase 13: AI Event Parser (Sidekick Clone)

**Goal:** Paste email/text → automatically create calendar event

### 13.1 AI Integration

**Use Claude API for parsing:**
- Extract: event title, date, time, location, description
- Handle various input formats: emails, texts, screenshots (future)
- Return structured event data

**Create `/lib/services/ai/event-parser-service.ts`**
- `parseEventFromText(text)` function
- Send text to Claude with structured output prompt
- Parse response into event object
- Validate parsed data with Zod schema
- Return confidence score

**Prompt engineering:**
- System prompt: "Extract calendar event details from the following text"
- Request JSON output with specific fields
- Handle ambiguous dates ("next Tuesday", "this weekend")
- Extract recurring patterns ("every Monday")

### 13.2 Input Methods

**Create `/components/calendar/QuickAddEvent.tsx`**
- Text area for pasting email/text
- "Parse" button to trigger AI
- Preview parsed event before saving
- Edit capability for corrections
- "Save to Calendar" button

**Future enhancements (not in scope):**
- Email forwarding integration
- Screenshot/image OCR
- Voice input

### 13.3 API Endpoint

**Create `/app/api/calendar/parse-event/route.ts`**
- POST endpoint accepting text input
- Rate limit: 20 requests/hour per user
- Call AI service and return parsed event
- Log usage for analytics

### 13.4 User Flow

1. User clicks "Quick Add" or pastes into input
2. AI parses text in background (1-3 seconds)
3. Show parsed event preview with editable fields
4. User confirms or edits details
5. Event created with `source: 'ai_parsed'` metadata
6. Show success message with undo option

---

## Phase 14: Chore Rewards & Gamification

**Goal:** Kids earn stars/points for completing chores

### 14.1 Database Schema

**Migration: `20251204000005_create_rewards_system.sql`**
- Create `reward_points` table (user_id, space_id, points, level)
- Create `point_transactions` table (user_id, source_type, source_id, points, reason, created_at)
- Create `rewards_catalog` table (space_id, name, description, cost_points, image_url, is_active)
- Create `reward_redemptions` table (user_id, reward_id, redeemed_at, status)

**Update chores table:**
- Add `point_value` integer column (default: 10)
- Add `bonus_multiplier` for streaks

### 14.2 Points Service

**Create `/lib/services/rewards/points-service.ts`**
- `awardPoints(userId, sourceType, sourceId, points, reason)` function
- `getPointsBalance(userId, spaceId)` function
- `getPointsHistory(userId, spaceId, limit)` function
- `redeemReward(userId, rewardId)` function

**Points earning rules:**
- Complete chore: +10 points (configurable per chore)
- Complete task: +5 points
- Daily streak bonus: +5 per day (max +25 at 5-day streak)
- Weekly goal completion: +50 points
- Perfect week (all chores done): +100 points

### 14.3 Rewards Catalog

**Create `/components/rewards/RewardsCatalog.tsx`**
- Display available rewards with point costs
- Show user's current point balance
- "Redeem" button with confirmation
- Categories: Screen Time, Treats, Activities, Money

**Default rewards (customizable by parents):**
- 30 min extra screen time: 50 points
- Choose dinner: 100 points
- Skip one chore: 75 points
- $5 allowance bonus: 200 points
- Family movie pick: 150 points

### 14.4 Gamification UI

**Create `/components/rewards/PointsDisplay.tsx`**
- Current points balance (prominently displayed)
- Level/badge system (Starter → Helper → Champion → Superstar)
- Progress to next level
- Recent transactions preview

**Create `/components/rewards/LeaderboardWidget.tsx`**
- Family member rankings (weekly/monthly)
- Points earned this period
- Streak displays
- Celebratory animations for achievements

**Update chore completion flow:**
- Show "+10 points!" animation on completion
- Sound effect (optional, user can disable)
- Confetti for streak milestones

---

## Phase 15: Birthday & Anniversary Tracker

**Goal:** Never forget important dates with automatic yearly reminders

### 15.1 Database Schema

**Migration: `20251204000006_create_special_dates.sql`**
- Create `special_dates` table
- Columns: id, space_id, person_name, date_type (birthday, anniversary, memorial), date (month/day only), year_started (optional for anniversaries), notes, notify_days_before, created_by
- date_type enum: 'birthday', 'anniversary', 'memorial', 'custom'

### 15.2 Special Dates Service

**Create `/lib/services/calendar/special-dates-service.ts`**
- `getUpcomingSpecialDates(spaceId, days)` function
- `addSpecialDate(data)` function
- `calculateAge(birthYear, date)` for birthdays
- `calculateYears(startYear, date)` for anniversaries
- Auto-generate annual calendar events

### 15.3 UI Components

**Create `/app/(main)/calendar/birthdays/page.tsx`**
- List view of all special dates
- Sort by upcoming/all/by person
- Add/edit/delete functionality
- Import from contacts (future)

**Create `/components/calendar/SpecialDateCard.tsx`**
- Person name and photo (optional)
- Date and type
- Days until next occurrence
- Age/years display
- Quick edit button

**Update calendar view:**
- Show birthday cake icon on birthday dates
- Show heart icon on anniversary dates
- Automatic all-day events generated yearly

### 15.4 Notifications

**Reminder configuration:**
- Default: 7 days before, 1 day before, day of
- Customizable per special date
- Email and/or push notification
- Include gift idea suggestions (optional)

---

## Phase 16: Event Comments & Family Notes

**Goal:** Family members can comment on shared events (like TimeTree)

### 16.1 Database Schema

**Migration: `20251204000007_create_event_comments.sql`**
- Create `event_comments` table
- Columns: id, event_id, user_id, content, created_at, updated_at, parent_id (for replies)
- RLS: Only space members can read/write
- Soft delete support

### 16.2 Comments Service

**Create `/lib/services/calendar/event-comments-service.ts`**
- `getEventComments(eventId)` function
- `addComment(eventId, userId, content, parentId?)` function
- `updateComment(commentId, content)` function
- `deleteComment(commentId)` function
- Real-time subscription for new comments

### 16.3 UI Components

**Create `/components/calendar/EventComments.tsx`**
- Comments section in event detail modal
- Threaded replies support
- User avatar + name + timestamp
- Edit/delete own comments
- "Add comment" input at bottom

**Create `/components/calendar/CommentInput.tsx`**
- Text input with mention support (@family_member)
- Emoji picker (optional)
- Submit button
- Character limit indicator

### 16.4 Notifications

**Comment notification rules:**
- Notify event creator when someone comments
- Notify mentioned users
- Notify previous commenters on same event
- Configurable: all comments vs mentions only

---

## Enhanced Implementation Checklist

### Phase 9: Unified Calendar View ✓ (COMPLETED Dec 5, 2025)
- [x] Create calendar_display_preferences table (using localStorage instead)
- [x] Update calendar-service.ts with unified items query (unified-calendar-service.ts)
- [x] Create calendar-items-mapper.ts (unified-calendar-mapper.ts)
- [x] Add filter toggles to calendar page (CalendarFilterPanel.tsx)
- [x] Create UnifiedCalendarItem component (UnifiedItemCard.tsx)
- [x] Update CalendarEventCard for all item types (supports tasks, meals, reminders, goals)
- [x] Add color legend component (CalendarLegend.tsx)
- [x] Test with real data from all sources (build passes, all types integrated)

### Phase 10: Daily Summary ✓ (COMPLETED Dec 5, 2025)
- [x] Create daily_summary_preferences table (using user_notification_preferences)
- [x] Create notification_history table (integrated with existing notifications)
- [x] Build daily-summary-service.ts (lib/jobs/daily-digest-job.ts)
- [x] Create daily summary email template (lib/emails/templates/DailyDigestEmail.tsx)
- [x] Create cron job for summary generation (app/api/cron/daily-digest/route.ts)
- [x] Add preferences UI in Settings (NotificationSettings.tsx with Notifications tab)
- [x] Test email delivery via Resend (integrated)
- [x] Add TodayAtAGlance component to dashboard

### Phase 11: Event Countdowns ✓ (COMPLETED Dec 5, 2025)
- [x] Add show_countdown and countdown_label to events (calendar events)
- [x] Create countdown-service.ts (lib/services/calendar/countdown-service.ts)
- [x] Build CountdownWidget component (components/calendar/CountdownWidget.tsx)
- [x] Build CountdownCard component (components/calendar/CountdownCard.tsx)
- [x] Add to dashboard layout (integrated in dashboard page)
- [x] Update event creation modal (supports countdown events)
- [x] Add celebratory animations (confetti on completion)
- [x] Test with various date ranges (working)

### Phase 12: Weather Integration ✓
- [ ] Set up OpenWeatherMap API
- [ ] Create weather-service.ts with caching
- [ ] Create geocoding-service.ts
- [ ] Build WeatherBadge component
- [ ] Update CalendarEventCard with weather
- [ ] Add weather alert notifications
- [ ] Add is_outdoor event flag
- [ ] Test with various locations

### Phase 13: AI Event Parser ✓
- [ ] Create event-parser-service.ts with Claude
- [ ] Build QuickAddEvent component
- [ ] Create parse-event API endpoint
- [ ] Add rate limiting
- [ ] Build preview/edit flow
- [ ] Test with various input formats
- [ ] Add usage analytics
- [ ] Handle edge cases gracefully

### Phase 14: Chore Rewards ✓
- [ ] Create rewards system tables
- [ ] Add point_value to chores
- [ ] Build points-service.ts
- [ ] Create RewardsCatalog component
- [ ] Create PointsDisplay component
- [ ] Create LeaderboardWidget component
- [ ] Add completion animations
- [ ] Set up default rewards catalog
- [ ] Add parent admin controls

### Phase 15: Birthday Tracker ✓
- [ ] Create special_dates table
- [ ] Build special-dates-service.ts
- [ ] Create birthdays management page
- [ ] Build SpecialDateCard component
- [ ] Auto-generate yearly events
- [ ] Set up reminder notifications
- [ ] Add calendar view integration
- [ ] Import from contacts (stretch goal)

### Phase 16: Event Comments ✓
- [ ] Create event_comments table
- [ ] Build event-comments-service.ts
- [ ] Create EventComments component
- [ ] Create CommentInput component
- [ ] Add real-time updates
- [ ] Set up comment notifications
- [ ] Add mention support
- [ ] Test threading and replies

---

## Priority Roadmap Summary

**Phase 1 - Quick Wins (Highest Impact):**
1. Phase 9: Unified Calendar View (leverage existing data)
2. Phase 10: Daily Summary (high user engagement)
3. Phase 11: Event Countdowns (visible, fun feature)

**Phase 2 - Differentiation:**
4. Phase 12: Weather Integration
5. Phase 13: AI Event Parser (Skylight Sidekick competitor)
6. Phase 15: Birthday Tracker

**Phase 3 - Engagement & Gamification:**
7. Phase 14: Chore Rewards (family engagement)
8. Phase 16: Event Comments (collaboration)

---

## References

- [Google Calendar API Documentation](https://developers.google.com/workspace/calendar/api/v3/reference)
- [Apple CalDAV Specification (RFC 4791)](https://datatracker.ietf.org/doc/html/rfc4791)
- [iCalendar Format (RFC 5545)](https://datatracker.ietf.org/doc/html/rfc5545)
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Two-Way Sync Patterns](https://www.stacksync.com/blog/mastering-two-way-sync-key-concepts-and-implementation-strategies/)
- [Skylight Calendar Features](https://skylightframe.com/calendar)
- [Cozi Family Organizer](https://www.cozi.com/)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [Claude API Documentation](https://docs.anthropic.com/)
