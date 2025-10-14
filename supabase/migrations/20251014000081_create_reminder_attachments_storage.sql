-- Migration: Create Reminder Attachments Storage Bucket
-- Purpose: Configure Supabase Storage for reminder file uploads
-- Feature: Phase 3 - Attachments & Context (#7)
-- Date: 2025-10-14

-- =============================================
-- CREATE REMINDER-ATTACHMENTS BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reminder-attachments',
  'reminder-attachments',
  FALSE, -- Private bucket - only space members can access
  10485760, -- 10MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- RLS POLICIES FOR REMINDER-ATTACHMENTS BUCKET
-- =============================================

-- Space members can view attachments for reminders in their space
DROP POLICY IF EXISTS "Space members can view reminder attachments" ON storage.objects;
CREATE POLICY "Space members can view reminder attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reminder-attachments' AND
  EXISTS (
    SELECT 1 FROM reminder_attachments ra
    JOIN reminders r ON ra.reminder_id = r.id
    JOIN space_members sm ON r.space_id = sm.space_id
    WHERE ra.file_path = name AND sm.user_id = auth.uid()
  )
);

-- Space members can upload attachments to reminders in their space
DROP POLICY IF EXISTS "Space members can upload reminder attachments" ON storage.objects;
CREATE POLICY "Space members can upload reminder attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reminder-attachments' AND
  EXISTS (
    SELECT 1 FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Users can delete their own uploaded attachments
DROP POLICY IF EXISTS "Users can delete own reminder attachments" ON storage.objects;
CREATE POLICY "Users can delete own reminder attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reminder-attachments' AND
  EXISTS (
    SELECT 1 FROM reminder_attachments
    WHERE file_path = name AND uploaded_by = auth.uid()
  )
);

