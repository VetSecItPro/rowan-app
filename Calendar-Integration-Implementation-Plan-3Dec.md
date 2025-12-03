# Calendar Integration Implementation Plan
**Multi-Platform Bidirectional Sync: Google Calendar, Apple CalDAV, Cozi**

## Overview

Implement seamless bidirectional calendar synchronization between Rowan and three external calendar providers (Google Calendar, Apple CalDAV, and Cozi) with automatic conflict resolution where external calendars win.

**User Requirements:**
- All three platforms from the start
- Two-way bidirectional sync
- External calendar wins on conflicts (Google/Apple/Cozi is master)
- Industry best practice for token storage (Supabase Vault with AES-256 encryption)

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

## Phase 4: Cozi Integration (Week 4)

### 4.1 Feasibility Assessment

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

### 4.2 Python Bridge (If Viable)

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

### 4.3 Sync Strategy (No Delta Sync)

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

### 4.4 Fallback Plan

**If py-cozi is NOT viable:**
1. Mark Cozi as "Coming Soon" in UI
2. Show waitlist signup form
3. Collect user emails for launch notification
4. Document limitation in help docs
5. Prioritize Google + Apple as primary integrations

---

## Phase 5: Background Jobs & Webhooks (Week 5)

### 5.1 Cron Jobs

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

### 5.2 Real-time Triggers

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

### 5.3 Queue Processing

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

## Phase 6: UI & User Experience (Week 6)

### 6.1 Connection Management Page

**Location:** `/app/(main)/settings/integrations/page.tsx`

**Features:**
- List connected calendars (Google, Apple, Cozi)
- Connection status indicators (active, syncing, error, token_expired)
- "Connect Calendar" button → OAuth flow
- Disconnect button → revoke access, delete sync mappings
- Sync stats: last sync time, events synced, conflicts resolved
- Manual sync button (rate limited to 10/hour)

### 6.2 OAuth Connection Flow

**User Journey:**
1. Click "Connect Google Calendar"
2. Redirected to Google authorization page
3. User grants permission
4. Redirected back to Rowan
5. Show progress: "Syncing calendar... 47/120 events"
6. Completion: "✓ Google Calendar connected! 120 events synced."
7. Dashboard shows sync status

### 6.3 Conflict Resolution UI

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

### 6.4 Sync Status Dashboard

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

## References

- [Google Calendar API Documentation](https://developers.google.com/workspace/calendar/api/v3/reference)
- [Apple CalDAV Specification (RFC 4791)](https://datatracker.ietf.org/doc/html/rfc4791)
- [iCalendar Format (RFC 5545)](https://datatracker.ietf.org/doc/html/rfc5545)
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Two-Way Sync Patterns](https://www.stacksync.com/blog/mastering-two-way-sync-key-concepts-and-implementation-strategies/)
