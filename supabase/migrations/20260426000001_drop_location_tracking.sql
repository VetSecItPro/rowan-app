-- ============================================================================
-- Drop Family Location Tracking Tables
-- ============================================================================
-- Strategic decision (2026-04-26): family location tracking is removed
-- entirely. Rowan targets "households broadly" (roommates, partners,
-- multi-gen, families with kids) — not Life360-style surveillance.
-- See CLAUDE.md "Feature Removal Log" for full rationale.
--
-- The original feature shipped in 20260125000001_create_location_tracking.sql.
-- That migration also created `push_tokens`, which is shared notification
-- infrastructure used elsewhere — DO NOT drop it.
--
-- Tables to drop (location-only):
--   1. geofence_events           — arrival/departure events for places
--   2. location_sharing_settings — per-user privacy controls
--   3. family_places             — saved geofenced places (home/school/work)
--   4. user_locations            — real-time position records
--
-- Order: child tables first (FK dependencies), then parents.
-- ============================================================================

DROP TABLE IF EXISTS public.geofence_events CASCADE;
DROP TABLE IF EXISTS public.location_sharing_settings CASCADE;
DROP TABLE IF EXISTS public.family_places CASCADE;
DROP TABLE IF EXISTS public.user_locations CASCADE;
