-- Add provider_config JSONB column to calendar_connections
--
-- Required by the ICS / Cozi calendar import features. The application code
-- (lib/services/calendar/ics-import-service.ts, app/api/calendar/connect/{ics,cozi})
-- reads and writes per-provider feed configuration here:
--   - ICSFeedConfig: { url, last_etag, last_modified, ... }
--   - Cozi feed credentials and cached HTTP cache headers for incremental sync.
--
-- Without this column the SELECT/UPDATE statements throw 42703 (undefined column),
-- which manifested as 500s on the calendar connect endpoints. This migration
-- syncs the schema to what the code has expected since the ICS feature shipped.

ALTER TABLE calendar_connections
  ADD COLUMN IF NOT EXISTS provider_config JSONB;

COMMENT ON COLUMN calendar_connections.provider_config IS
  'Per-provider configuration blob (e.g. ICSFeedConfig for ICS/Cozi: feed URL, last_etag, last_modified). Nullable for providers that do not need extra config.';
