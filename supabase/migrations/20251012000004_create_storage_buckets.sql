-- Migration: Create storage buckets for file uploads
-- Date: October 12, 2025
-- Purpose: Add storage buckets for avatars and recipe images

-- ==========================================
-- 1. AVATARS BUCKET
-- ==========================================
-- Create bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE, -- Public bucket for easy access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for avatars bucket
-- Anyone can view avatars (public bucket)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ==========================================
-- 2. RECIPES BUCKET
-- ==========================================
-- Create bucket for recipe images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipes',
  'recipes',
  TRUE, -- Public for easy sharing
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for recipes bucket
-- Anyone can view recipe images (public bucket)
DROP POLICY IF EXISTS "Anyone can view recipe images" ON storage.objects;
CREATE POLICY "Anyone can view recipe images"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipes');

-- Space members can upload recipe images
DROP POLICY IF EXISTS "Space members can upload recipe images" ON storage.objects;
CREATE POLICY "Space members can upload recipe images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipes' AND
  EXISTS (
    SELECT 1 FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Space members can update their own recipe images
DROP POLICY IF EXISTS "Space members can update recipe images" ON storage.objects;
CREATE POLICY "Space members can update recipe images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'recipes' AND
  EXISTS (
    SELECT 1 FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- Space members can delete their own recipe images
DROP POLICY IF EXISTS "Space members can delete recipe images" ON storage.objects;
CREATE POLICY "Space members can delete recipe images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recipes' AND
  EXISTS (
    SELECT 1 FROM space_members
    WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- 3. ADD AVATAR_URL TO USERS TABLE
-- ==========================================
-- Add avatar_url column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- ==========================================
-- 4. ADD IMAGE_URL TO RECIPES TABLE
-- ==========================================
-- Add image_url column to recipes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE recipes ADD COLUMN image_url TEXT;
  END IF;
END $$;
