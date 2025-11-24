-- Migration: Secure Shopping List Tokens
-- Date: November 24, 2025
-- Purpose: Replace insecure UUID tokens with cryptographically secure tokens

-- ==========================================
-- 1. SECURE TOKEN GENERATION FUNCTION
-- ==========================================

-- Function to generate cryptographically secure tokens
-- Equivalent to Node.js crypto.randomBytes(32).toString('base64url')
CREATE OR REPLACE FUNCTION generate_secure_share_token()
RETURNS TEXT AS $$
BEGIN
  -- Generate 32 random bytes and encode as base64url (URL-safe)
  -- This provides 256 bits of entropy vs 128 bits from UUIDs
  RETURN encode(gen_random_bytes(32), 'base64')
    -- Convert to URL-safe base64 by replacing characters
    -- + becomes -, / becomes _, and remove padding =
    ||= REPLACE(REPLACE(TRIM(TRAILING '=' FROM encode(gen_random_bytes(32), 'base64')), '+', '-'), '/', '_');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. UPDATE TRIGGER FOR SECURE TOKENS
-- ==========================================

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS set_shopping_list_shared_at ON shopping_lists;
DROP FUNCTION IF EXISTS update_shared_at();

-- New function that generates secure tokens when lists become public
CREATE OR REPLACE FUNCTION update_shared_at_secure()
RETURNS TRIGGER AS $$
BEGIN
  -- If list is being made public and wasn't public before
  IF NEW.is_public = TRUE AND (OLD.is_public IS NULL OR OLD.is_public = FALSE) THEN
    NEW.shared_at = NOW();
    -- Generate a new secure token when making list public
    NEW.share_token = generate_secure_share_token();
  END IF;

  -- If list is being made private
  IF NEW.is_public = FALSE AND OLD.is_public = TRUE THEN
    NEW.shared_at = NULL;
    -- Optionally regenerate token or keep existing one
    -- NEW.share_token = generate_secure_share_token();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the updated trigger
CREATE TRIGGER set_shopping_list_shared_at_secure
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_at_secure();

-- ==========================================
-- 3. UPDATE DEFAULT VALUE FOR NEW RECORDS
-- ==========================================

-- Update the default value for share_token to use secure generation
-- Note: We keep the existing column to avoid data loss
ALTER TABLE shopping_lists
ALTER COLUMN share_token SET DEFAULT generate_secure_share_token();

-- ==========================================
-- 4. OPTIONAL: UPDATE EXISTING TOKENS
-- ==========================================

-- Uncomment to update existing tokens (be careful - this will invalidate existing share links)
-- UPDATE shopping_lists
-- SET share_token = generate_secure_share_token()
-- WHERE share_token ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ==========================================
-- 5. COMMENTS AND DOCUMENTATION
-- ==========================================

COMMENT ON FUNCTION generate_secure_share_token() IS 'Generates cryptographically secure 256-bit tokens for shopping list sharing';
COMMENT ON FUNCTION update_shared_at_secure() IS 'Trigger function that generates secure tokens when lists are made public';
COMMENT ON COLUMN shopping_lists.share_token IS 'Cryptographically secure token for public sharing (256-bit entropy)';

-- ==========================================
-- 6. SECURITY NOTES
-- ==========================================

-- This migration addresses the shopping list token enumeration vulnerability by:
-- 1. Replacing predictable UUIDs (128-bit) with secure random tokens (256-bit)
-- 2. Using URL-safe base64 encoding for better compatibility
-- 3. Automatically generating secure tokens when lists are made public
-- 4. Maintaining backward compatibility with existing share links

-- The new tokens are resistant to:
-- - Brute force enumeration attacks
-- - Pattern-based guessing
-- - Statistical analysis attacks