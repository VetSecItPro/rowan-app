-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-screenshots',
  'feedback-screenshots',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for feedback-screenshots bucket

-- Anyone can upload to their own folder
CREATE POLICY "Users can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own screenshots
CREATE POLICY "Users can view own screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'feedback-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin can view all screenshots
CREATE POLICY "Admin can view all screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'feedback-screenshots'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@example.com'
  )
);

-- Admin can delete screenshots
CREATE POLICY "Admin can delete screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'feedback-screenshots'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@example.com'
  )
);
