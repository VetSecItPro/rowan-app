// Calendar Integration Types
// Phase 2: TypeScript interfaces for external calendar sync

// =============================================================================
// ENUMS (matching database types)
// =============================================================================

export type CalendarProvider = 'google' | 'apple' | 'outlook' | 'ics' | 'cozi';

export type SyncStatus = 'active' | 'syncing' | 'error' | 'token_expired' | 'disconnected';

export type SyncDirection = 'bidirectional' | 'inbound_only' | 'outbound_only';

export type SyncType = 'full' | 'incremental' | 'manual' | 'webhook_triggered';

export type SyncLogStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';

export type ResolutionStatus = 'detected' | 'resolved' | 'failed';

export type WinningSource = 'external' | 'rowan' | 'merged' | 'manual';

export type ResolutionStrategy = 'external_wins' | 'rowan_wins' | 'merge' | 'manual_review';

export type QueueOperation = 'create' | 'update' | 'delete';

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

// =============================================================================
// DATABASE MODELS
// =============================================================================

export interface CalendarConnection {
  id: string;
  user_id: string;
  space_id: string;
  provider: CalendarProvider;
  provider_account_id: string | null;
  provider_calendar_id: string | null;
  access_token_vault_id: string | null;
  refresh_token_vault_id: string | null;
  token_expires_at: string | null;
  sync_direction: SyncDirection;
  sync_status: SyncStatus;
  sync_token: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  webhook_channel_id: string | null;
  webhook_resource_id: string | null;
  webhook_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventMapping {
  id: string;
  rowan_event_id: string;
  connection_id: string;
  external_event_id: string;
  external_calendar_id: string;
  sync_direction: SyncDirection;
  rowan_etag: string | null;
  external_etag: string | null;
  last_synced_at: string;
  has_conflict: boolean;
  conflict_detected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncLog {
  id: string;
  connection_id: string;
  sync_type: SyncType;
  sync_direction: SyncDirection;
  started_at: string;
  completed_at: string | null;
  status: SyncLogStatus;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  conflicts_detected: number;
  error_code: string | null;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  triggered_by: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface CalendarSyncConflict {
  id: string;
  mapping_id: string;
  connection_id: string;
  detected_at: string;
  resolved_at: string | null;
  resolution_status: ResolutionStatus;
  rowan_version: RowanEventSnapshot;
  external_version: ExternalEventSnapshot;
  winning_source: WinningSource | null;
  resolution_strategy: ResolutionStrategy;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarWebhookSubscription {
  id: string;
  connection_id: string;
  provider: CalendarProvider;
  webhook_id: string;
  webhook_url: string;
  webhook_secret: string;
  resource_id: string;
  expires_at: string;
  is_active: boolean;
  events_received: number;
  last_event_at: string | null;
  renewal_attempted_at: string | null;
  renewal_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncQueueItem {
  id: string;
  event_id: string | null;
  connection_id: string;
  mapping_id: string | null;
  operation: QueueOperation;
  priority: number;
  status: QueueStatus;
  event_snapshot: RowanEventSnapshot | null;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

// =============================================================================
// EVENT SNAPSHOTS
// =============================================================================

export interface RowanEventSnapshot {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  // Primary fields matching actual DB columns
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  location: string | null;
  category: string | null;
  status: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  custom_color: string | null;  // DB column name (not 'color')
  timezone: string | null;
  assigned_to: string | null;
  event_type: string | null;
  external_source: string | null;
  last_external_sync: string | null;
  sync_locked: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ExternalEventSnapshot {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  start: string;
  end: string | null;
  all_day: boolean;
  location: string | null;
  status: string | null;
  recurrence: string | null;
  etag: string | null;
  updated: string;
  organizer: string | null;
  attendees: ExternalAttendee[] | null;
}

export interface ExternalAttendee {
  email: string;
  display_name: string | null;
  response_status: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  organizer: boolean;
  self: boolean;
}

// =============================================================================
// GOOGLE CALENDAR TYPES
// =============================================================================

export interface GoogleCalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: GoogleAttendee[];
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  etag: string;
  updated: string;
  created: string;
  htmlLink: string;
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

export interface GoogleAttendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  organizer?: boolean;
  self?: boolean;
}

export interface GoogleCalendarList {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  timeZone?: string;
}

export interface GoogleSyncResponse {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  nextSyncToken?: string;
  nextPageToken?: string;
  items: GoogleCalendarEvent[];
}

export interface GoogleWebhookNotification {
  channelId: string;
  messageNumber: string;
  resourceId: string;
  resourceState: 'sync' | 'exists' | 'not_exists';
  resourceUri: string;
  expiration?: string;
}

// =============================================================================
// APPLE CALDAV TYPES
// =============================================================================

export interface CalDAVEvent {
  url: string;
  etag: string;
  data: string; // Raw iCalendar data
  calendarData?: ParsedICalEvent;
}

export interface ParsedICalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: string;
  dtend?: string;
  dtstamp: string;
  rrule?: string;
  recurrenceId?: string;
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  organizer?: string;
  attendees?: ICalAttendee[];
  lastModified?: string;
  created?: string;
  sequence?: number;
}

export interface ICalAttendee {
  email: string;
  cn?: string;
  partstat?: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
  role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT' | 'CHAIR';
}

export interface CalDAVCalendar {
  url: string;
  displayName: string;
  ctag: string;
  syncToken?: string;
  description?: string;
  timezone?: string;
  color?: string;
}

// =============================================================================
// MICROSOFT OUTLOOK TYPES (Microsoft Graph API)
// =============================================================================

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  bodyPreview?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
  };
  isAllDay: boolean;
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  type: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  recurrence?: OutlookRecurrence;
  seriesMasterId?: string;
  attendees?: OutlookAttendee[];
  organizer?: {
    emailAddress: {
      name?: string;
      address: string;
    };
  };
  isReminderOn: boolean;
  reminderMinutesBeforeStart?: number;
  webLink: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  changeKey: string; // ETag equivalent
  categories?: string[];
}

export interface OutlookAttendee {
  type: 'required' | 'optional' | 'resource';
  status: {
    response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
    time?: string;
  };
  emailAddress: {
    name?: string;
    address: string;
  };
}

export interface OutlookRecurrence {
  pattern: {
    type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
    interval: number;
    daysOfWeek?: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[];
    dayOfMonth?: number;
    month?: number;
    firstDayOfWeek?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    index?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  };
  range: {
    type: 'endDate' | 'noEnd' | 'numbered';
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
    recurrenceTimeZone?: string;
  };
}

export interface OutlookCalendar {
  id: string;
  name: string;
  color?: 'auto' | 'lightBlue' | 'lightGreen' | 'lightOrange' | 'lightGray' | 'lightYellow' | 'lightTeal' | 'lightPink' | 'lightBrown' | 'lightRed' | 'maxColor';
  changeKey: string;
  canShare: boolean;
  canViewPrivateItems: boolean;
  canEdit: boolean;
  owner?: {
    name?: string;
    address: string;
  };
  isDefaultCalendar?: boolean;
}

export interface OutlookDeltaResponse {
  '@odata.context': string;
  '@odata.deltaLink'?: string;
  '@odata.nextLink'?: string;
  deltaLink?: string;
  nextLink?: string;
  value: OutlookCalendarEvent[];
}

export interface OutlookWebhookNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: string;
  resourceData?: {
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
    id: string;
  };
  clientState?: string;
  tenantId: string;
}

export interface OutlookOAuthCallbackParams {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

// =============================================================================
// ICS FEED TYPES
// =============================================================================

export interface ICSFeedConfig {
  url: string;
  name: string;
  refresh_interval_minutes: number;
  last_etag?: string;
  last_modified?: string;
}

export interface ICSFeedEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: string;
  dtend?: string;
  dtstamp: string;
  rrule?: string;
  recurrenceId?: string;
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  categories?: string[];
  url?: string;
  organizer?: string;
  lastModified?: string;
  created?: string;
  sequence?: number;
}

export interface ICSImportResult {
  success: boolean;
  feed_url: string;
  events_imported: number;
  events_updated: number;
  events_removed: number;
  errors: string[];
  last_modified?: string;
  etag?: string;
}

export interface ICSFeedConnection extends CalendarConnection {
  provider: 'ics';
  ics_url: string;
  ics_name: string;
  ics_last_etag: string | null;
  ics_event_count: number;
}

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

export interface SyncResult {
  success: boolean;
  connection_id: string;
  sync_type: SyncType;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  eventsProcessed?: number;
  conflicts_detected: number;
  errors: SyncError[];
  duration_ms: number;
  next_sync_token?: string;
}

export interface SyncError {
  event_id?: string;
  external_event_id?: string;
  operation: QueueOperation;
  error_code: string;
  error_message: string;
  recoverable: boolean;
}

export interface ConflictResolution {
  conflict_id: string;
  winning_source: WinningSource;
  resolved_by?: string;
  notes?: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface ConnectCalendarRequest {
  provider: CalendarProvider;
  space_id: string;
  sync_direction?: SyncDirection;
}

export interface GoogleOAuthCallbackParams {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

export interface AppleCalDAVCredentials {
  email: string;
  app_specific_password: string;
}

export interface CoziCredentials {
  email: string;
  password: string;
}

export interface ConnectionStatusResponse {
  id: string;
  provider: CalendarProvider;
  provider_account_id: string | null;
  sync_status: SyncStatus;
  sync_direction: SyncDirection;
  last_sync_at: string | null;
  next_sync_at: string | null;
  events_synced: number;
  conflicts_pending: number;
  error_message?: string;
}

export interface SyncHistoryResponse {
  logs: CalendarSyncLog[];
  total_count: number;
  has_more: boolean;
}

export interface ConflictListResponse {
  conflicts: CalendarSyncConflict[];
  total_count: number;
  has_more: boolean;
}

// =============================================================================
// EVENT MAPPING UTILITIES
// =============================================================================

export interface EventMappingInput {
  rowan_event_id: string;
  connection_id: string;
  external_event_id: string;
  external_calendar_id: string;
  sync_direction?: SyncDirection;
}

export interface RowanToExternalMapper {
  mapToGoogle(event: RowanEventSnapshot): Partial<GoogleCalendarEvent>;
  mapToCalDAV(event: RowanEventSnapshot): string; // iCalendar format
}

export interface ExternalToRowanMapper {
  mapFromGoogle(event: GoogleCalendarEvent, spaceId: string): Partial<RowanEventSnapshot>;
  mapFromCalDAV(event: ParsedICalEvent, spaceId: string): Partial<RowanEventSnapshot>;
}

// =============================================================================
// OAUTH STATE
// =============================================================================

export interface OAuthState {
  provider: CalendarProvider;
  user_id: string;
  space_id: string;
  redirect_url: string;
  created_at: number;
  expires_at: number;
}

export interface TokenRefreshResult {
  success: boolean;
  access_token?: string;
  expires_in?: number;
  error?: string;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

export interface WebhookRegistration {
  connection_id: string;
  webhook_url: string;
  resource_id: string;
  channel_id: string;
  expiration: string;
}

export interface WebhookRenewalResult {
  success: boolean;
  new_expiration?: string;
  error?: string;
}
