-- Migration: Create Message Attachments Storage Bucket
-- Purpose: Configure Supabase Storage for message file uploads (images, videos, documents, audio)
-- Feature: Phase 2 - Rich Media File Uploads
-- Date: 2025-10-15

-- =============================================
-- CREATE MESSAGE-ATTACHMENTS BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  FALSE, -- Private bucket - only space members can access
  52428800, -- 50MB limit per file
  ARRAY[
    -- Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    -- Videos
    'video/mp4',
    'video/quicktime',
    'video/webm',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    -- Audio
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- RLS POLICIES FOR MESSAGE-ATTACHMENTS BUCKET
-- =============================================

-- Space members can view attachments for messages in their conversations
DROP POLICY IF EXISTS "Space members can view message attachments" ON storage.objects;
CREATE POLICY "Space members can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 FROM message_attachments ma
    JOIN messages m ON ma.message_id = m.id
    JOIN conversations c ON m.conversation_id = c.id
    JOIN space_members sm ON c.space_id = sm.space_id
    WHERE ma.storage_path = name AND sm.user_id = auth.uid()
  )
);

-- Space members can upload attachments to messages in their conversations
DROP POLICY IF EXISTS "Space members can upload message attachments" ON storage.objects;
CREATE POLICY "Space members can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.role() = 'authenticated'
);

-- Users can delete their own uploaded attachments
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 FROM message_attachments
    WHERE storage_path = name AND uploaded_by = auth.uid()
  )
);
