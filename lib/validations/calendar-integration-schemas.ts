// Calendar Integration Zod Schemas
// Phase 2: Input validation for all calendar integration endpoints

import { z } from 'zod';

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const CalendarProviderSchema = z.enum(['google', 'apple', 'cozi']);

export const SyncStatusSchema = z.enum(['active', 'syncing', 'error', 'token_expired', 'disconnected']);

export const SyncDirectionSchema = z.enum(['bidirectional', 'inbound_only', 'outbound_only']);

export const SyncTypeSchema = z.enum(['full', 'incremental', 'manual', 'webhook_triggered']);

export const SyncLogStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed', 'partial']);

export const ResolutionStatusSchema = z.enum(['detected', 'resolved', 'failed']);

export const WinningSourceSchema = z.enum(['external', 'rowan', 'merged', 'manual']);

export const ResolutionStrategySchema = z.enum(['external_wins', 'rowan_wins', 'merge', 'manual_review']);

export const QueueOperationSchema = z.enum(['create', 'update', 'delete']);

export const QueueStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

// =============================================================================
// API REQUEST SCHEMAS
// =============================================================================

// Connect calendar request
export const ConnectCalendarRequestSchema = z.object({
  provider: CalendarProviderSchema,
  space_id: z.string().uuid('Invalid space ID format'),
  sync_direction: SyncDirectionSchema.optional().default('bidirectional'),
  login_hint: z.string().email('Invalid email format').optional(),
});

// Google OAuth callback params
export const GoogleOAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// Apple CalDAV credentials
export const AppleCalDAVCredentialsSchema = z.object({
  email: z.string().email('Invalid email format'),
  app_specific_password: z
    .string()
    .min(16, 'App-specific password must be at least 16 characters')
    .regex(/^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i, 'Invalid app-specific password format (expected: xxxx-xxxx-xxxx-xxxx)'),
  space_id: z.string().uuid('Invalid space ID format'),
  sync_direction: SyncDirectionSchema.optional().default('bidirectional'),
});

// Cozi credentials
export const CoziCredentialsSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  space_id: z.string().uuid('Invalid space ID format'),
  sync_direction: SyncDirectionSchema.optional().default('bidirectional'),
});

// Disconnect calendar request
export const DisconnectCalendarRequestSchema = z.object({
  connection_id: z.string().uuid('Invalid connection ID format'),
  delete_synced_events: z.boolean().optional().default(false),
});

// Manual sync request
export const ManualSyncRequestSchema = z.object({
  connection_id: z.string().uuid('Invalid connection ID format'),
  sync_type: z.enum(['full', 'incremental']).optional().default('incremental'),
});

// =============================================================================
// CONFLICT RESOLUTION SCHEMAS
// =============================================================================

export const ResolveConflictRequestSchema = z.object({
  conflict_id: z.string().uuid('Invalid conflict ID format'),
  winning_source: WinningSourceSchema,
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

export const BulkResolveConflictsRequestSchema = z.object({
  conflict_ids: z.array(z.string().uuid()).min(1, 'At least one conflict ID required').max(50, 'Cannot resolve more than 50 conflicts at once'),
  resolution_strategy: ResolutionStrategySchema,
  notes: z.string().max(1000).optional(),
});

// =============================================================================
// WEBHOOK SCHEMAS
// =============================================================================

export const GoogleWebhookHeadersSchema = z.object({
  'x-goog-channel-id': z.string().min(1),
  'x-goog-message-number': z.string(),
  'x-goog-resource-id': z.string().min(1),
  'x-goog-resource-state': z.enum(['sync', 'exists', 'not_exists']),
  'x-goog-resource-uri': z.string().url().optional(),
  'x-goog-channel-expiration': z.string().optional(),
});

// =============================================================================
// SYNC LOG QUERY SCHEMAS
// =============================================================================

export const SyncLogQuerySchema = z.object({
  connection_id: z.string().uuid().optional(),
  status: SyncLogStatusSchema.optional(),
  sync_type: SyncTypeSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const ConflictQuerySchema = z.object({
  connection_id: z.string().uuid().optional(),
  resolution_status: ResolutionStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// =============================================================================
// EVENT MAPPING SCHEMAS
// =============================================================================

export const EventMappingInputSchema = z.object({
  rowan_event_id: z.string().uuid('Invalid Rowan event ID'),
  connection_id: z.string().uuid('Invalid connection ID'),
  external_event_id: z.string().min(1, 'External event ID required'),
  external_calendar_id: z.string().min(1, 'External calendar ID required'),
  sync_direction: SyncDirectionSchema.optional().default('bidirectional'),
});

// =============================================================================
// GOOGLE CALENDAR EVENT SCHEMAS (for validation when receiving from API)
// =============================================================================

export const GoogleEventDateTimeSchema = z.object({
  dateTime: z.string().datetime().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeZone: z.string().optional(),
}).refine(
  (data) => data.dateTime !== undefined || data.date !== undefined,
  { message: 'Either dateTime or date must be provided' }
);

export const GoogleCalendarEventSchema = z.object({
  id: z.string(),
  calendarId: z.string().optional(),
  summary: z.string().optional().default('(No title)'),
  description: z.string().optional(),
  location: z.string().optional(),
  start: GoogleEventDateTimeSchema,
  end: GoogleEventDateTimeSchema,
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional().default('confirmed'),
  recurrence: z.array(z.string()).optional(),
  recurringEventId: z.string().optional(),
  etag: z.string(),
  updated: z.string(),
  created: z.string().optional(),
  htmlLink: z.string().url().optional(),
  colorId: z.string().optional(),
});

// =============================================================================
// CALDAV/ICALENDAR SCHEMAS
// =============================================================================

export const ICalEventSchema = z.object({
  uid: z.string().min(1, 'UID is required'),
  summary: z.string().optional().default('(No title)'),
  description: z.string().optional(),
  location: z.string().optional(),
  dtstart: z.string().min(1, 'Start date is required'),
  dtend: z.string().optional(),
  dtstamp: z.string(),
  rrule: z.string().optional(),
  recurrenceId: z.string().optional(),
  status: z.enum(['TENTATIVE', 'CONFIRMED', 'CANCELLED']).optional(),
  lastModified: z.string().optional(),
  created: z.string().optional(),
  sequence: z.number().int().min(0).optional(),
});

// =============================================================================
// CONNECTION STATUS SCHEMAS
// =============================================================================

export const ConnectionListQuerySchema = z.object({
  space_id: z.string().uuid().optional(),
  provider: CalendarProviderSchema.optional(),
  status: SyncStatusSchema.optional(),
});

export const UpdateConnectionSettingsSchema = z.object({
  connection_id: z.string().uuid('Invalid connection ID'),
  sync_direction: SyncDirectionSchema.optional(),
  sync_enabled: z.boolean().optional(),
});

// =============================================================================
// CRON JOB SCHEMAS
// =============================================================================

export const CronSyncRequestSchema = z.object({
  provider: CalendarProviderSchema.optional(),
  connection_id: z.string().uuid().optional(),
  force_full_sync: z.boolean().optional().default(false),
});

export const WebhookRenewalRequestSchema = z.object({
  hours_ahead: z.coerce.number().int().min(1).max(168).optional().default(24),
});

// =============================================================================
// RATE LIMITING SCHEMAS
// =============================================================================

export const RateLimitConfigSchema = z.object({
  provider: CalendarProviderSchema,
  requests_per_minute: z.number().int().min(1),
  requests_per_hour: z.number().int().min(1),
  requests_per_day: z.number().int().min(1),
});

// Default rate limits per provider
export const DEFAULT_RATE_LIMITS: Record<string, { requests_per_minute: number; requests_per_hour: number; requests_per_day: number }> = {
  google: { requests_per_minute: 300, requests_per_hour: 10000, requests_per_day: 100000 },
  apple: { requests_per_minute: 30, requests_per_hour: 1000, requests_per_day: 10000 },
  cozi: { requests_per_minute: 10, requests_per_hour: 200, requests_per_day: 2000 },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function validateCalendarProvider(provider: string): provider is 'google' | 'apple' | 'cozi' {
  return ['google', 'apple', 'cozi'].includes(provider);
}

export function validateSyncDirection(direction: string): direction is 'bidirectional' | 'inbound_only' | 'outbound_only' {
  return ['bidirectional', 'inbound_only', 'outbound_only'].includes(direction);
}

// =============================================================================
// TYPE EXPORTS (inferred from schemas)
// =============================================================================

export type ConnectCalendarRequest = z.infer<typeof ConnectCalendarRequestSchema>;
export type GoogleOAuthCallback = z.infer<typeof GoogleOAuthCallbackSchema>;
export type AppleCalDAVCredentials = z.infer<typeof AppleCalDAVCredentialsSchema>;
export type CoziCredentials = z.infer<typeof CoziCredentialsSchema>;
export type DisconnectCalendarRequest = z.infer<typeof DisconnectCalendarRequestSchema>;
export type ManualSyncRequest = z.infer<typeof ManualSyncRequestSchema>;
export type ResolveConflictRequest = z.infer<typeof ResolveConflictRequestSchema>;
export type BulkResolveConflictsRequest = z.infer<typeof BulkResolveConflictsRequestSchema>;
export type GoogleWebhookHeaders = z.infer<typeof GoogleWebhookHeadersSchema>;
export type SyncLogQuery = z.infer<typeof SyncLogQuerySchema>;
export type ConflictQuery = z.infer<typeof ConflictQuerySchema>;
export type EventMappingInput = z.infer<typeof EventMappingInputSchema>;
export type GoogleCalendarEvent = z.infer<typeof GoogleCalendarEventSchema>;
export type ICalEvent = z.infer<typeof ICalEventSchema>;
export type ConnectionListQuery = z.infer<typeof ConnectionListQuerySchema>;
export type UpdateConnectionSettings = z.infer<typeof UpdateConnectionSettingsSchema>;
export type CronSyncRequest = z.infer<typeof CronSyncRequestSchema>;
export type WebhookRenewalRequest = z.infer<typeof WebhookRenewalRequestSchema>;
