// Calendar Integration Services
// Export all calendar-related services from a single entry point

export { googleCalendarService } from './google-calendar-service';
export { appleCalDAVService } from './apple-caldav-service';
export { outlookCalendarService } from './outlook-calendar-service';
export { icsImportService } from './ics-import-service';
export { eventMapper } from './event-mapper';
export { calendarSyncService } from './calendar-sync-service';

// Phase 9: Unified Calendar View
export { unifiedCalendarMapper } from './unified-calendar-mapper';
export { unifiedCalendarService } from './unified-calendar-service';

// Re-export types for convenience
export type {
  CalendarProvider,
  SyncStatus,
  SyncDirection,
  SyncType,
  CalendarConnection,
  CalendarEventMapping,
  CalendarSyncLog,
  CalendarSyncConflict,
  SyncResult,
  SyncError,
  GoogleCalendarEvent,
  GoogleCalendarList,
  OutlookCalendarEvent,
  OutlookCalendar,
  OutlookDeltaResponse,
  RowanEventSnapshot,
  ExternalEventSnapshot,
  TokenRefreshResult,
  WebhookRegistration,
} from '@/lib/types/calendar-integration';
