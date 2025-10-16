-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for users to upload receipts to their own space
CREATE POLICY "Users can upload receipts to their spaces"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] IN (
    SELECT spaces.id::text
    FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- Create policy for users to view receipts from their spaces
CREATE POLICY "Users can view receipts from their spaces"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] IN (
    SELECT spaces.id::text
    FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- Create policy for users to delete receipts from their spaces
CREATE POLICY "Users can delete receipts from their spaces"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] IN (
    SELECT spaces.id::text
    FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- Create receipts table to store metadata
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,

  -- OCR extracted data
  merchant_name TEXT,
  total_amount DECIMAL(10, 2),
  receipt_date DATE,
  category TEXT,
  currency TEXT DEFAULT 'USD',

  -- OCR metadata
  ocr_text TEXT, -- Raw OCR text
  ocr_confidence DECIMAL(5, 2), -- 0-100 confidence score
  ocr_processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_receipts_space_id ON receipts(space_id);
CREATE INDEX IF NOT EXISTS idx_receipts_expense_id ON receipts(expense_id);
CREATE INDEX IF NOT EXISTS idx_receipts_merchant_name ON receipts(merchant_name);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date ON receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view receipts from their spaces"
ON receipts FOR SELECT
TO authenticated
USING (
  space_id IN (
    SELECT spaces.id
    FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create receipts in their spaces"
ON receipts FOR INSERT
TO authenticated
WITH CHECK (
  space_id IN (
    SELECT spaces.id
    FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update receipts in their spaces"
ON receipts FOR UPDATE
TO authenticated
USING (
  space_id IN (
    SELECT spaces.id
    FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete receipts in their spaces"
ON receipts FOR DELETE
TO authenticated
USING (
  space_id IN (
    SELECT spaces.id
    FROM spaces
    INNER JOIN partnership_members ON spaces.partnership_id = partnership_members.partnership_id
    WHERE partnership_members.user_id = auth.uid()
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER receipts_updated_at
BEFORE UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION update_receipts_updated_at();

-- Add receipt_id to expenses table for linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_expenses_receipt_id ON expenses(receipt_id);
  END IF;
END $$;
