// Calendar Integration Services
// Export all calendar-related services from a single entry point

export { googleCalendarService } from './google-calendar-service';
export { appleCalDAVService } from './apple-caldav-service';
export { eventMapper } from './event-mapper';
export { calendarSyncService } from './calendar-sync-service';

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
  RowanEventSnapshot,
  ExternalEventSnapshot,
  TokenRefreshResult,
  WebhookRegistration,
} from '@/lib/types/calendar-integration';
