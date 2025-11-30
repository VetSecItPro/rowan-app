-- Fix the generate_secure_share_token function
-- The previous version had syntax errors (||= doesn't exist in PostgreSQL)
-- and was calling gen_random_bytes twice

-- First, remove the default value that depends on the function
ALTER TABLE shopping_lists ALTER COLUMN share_token DROP DEFAULT;

-- Now we can drop and recreate the function
DROP FUNCTION IF EXISTS generate_secure_share_token();

CREATE OR REPLACE FUNCTION generate_secure_share_token()
RETURNS TEXT AS $$
DECLARE
  random_bytes bytea;
  base64_string text;
BEGIN
  -- Generate 32 random bytes (256 bits of entropy)
  random_bytes := gen_random_bytes(32);

  -- Encode as base64
  base64_string := encode(random_bytes, 'base64');

  -- Convert to URL-safe base64 by replacing characters and removing padding
  -- + becomes -, / becomes _, remove trailing =
  base64_string := REPLACE(REPLACE(TRIM(TRAILING '=' FROM base64_string), '+', '-'), '/', '_');

  RETURN base64_string;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore the default value
ALTER TABLE shopping_lists ALTER COLUMN share_token SET DEFAULT generate_secure_share_token();

COMMENT ON FUNCTION generate_secure_share_token() IS 'Generates cryptographically secure 256-bit URL-safe tokens for shopping list sharing';
