-- Add the missing 'outlook' and 'ics' values to the calendar_provider enum.
--
-- ROOT CAUSE (found rebuilding external-calendar sync, 8 June): the connect
-- routes (app/api/calendar/connect/{outlook,ics}) and the CalendarConnections UI
-- offer 5 providers (google, apple, outlook, ics, cozi), but the calendar_provider
-- enum only had google/apple/cozi. Creating an Outlook or ICS connection therefore
-- failed at the DB with "invalid input value for enum calendar_provider" — i.e.
-- Outlook/ICS sync was broken at connection-creation, upstream of the dropped
-- OAuth token functions (rebuilt in 20260608190000).
--
-- ADD VALUE IF NOT EXISTS is idempotent. New enum values cannot be USED in the
-- same transaction they're added, but this migration only declares them, so it is
-- transaction-safe.

ALTER TYPE public.calendar_provider ADD VALUE IF NOT EXISTS 'outlook';
ALTER TYPE public.calendar_provider ADD VALUE IF NOT EXISTS 'ics';
