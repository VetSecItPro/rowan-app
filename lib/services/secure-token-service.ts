/**
 * Secure Token Generation Service
 * Replaces insecure UUID-based tokens with cryptographically secure tokens
 */

import { generateSecureShareToken } from '@/lib/ratelimit-shopping';
import { createClient } from '@/lib/supabase/client';

export interface SecureToken {
  token: string;
  expiresAt?: Date;
}

/**
 * Generate a new secure share token for shopping lists
 */
export function generateShoppingListToken(): string {
  return generateSecureShareToken();
}

/**
 * Update a shopping list to use a secure token when made public
 */
export async function secureShoppingListToken(listId: string): Promise<string> {
  const supabase = createClient();
  const newToken = generateShoppingListToken();

  const { error } = await supabase
    .from('shopping_lists')
    .update({ share_token: newToken })
    .eq('id', listId);

  if (error) {
    throw new Error(`Failed to update shopping list token: ${error.message}`);
  }

  return newToken;
}

/**
 * Validate token format (basic check to reject obviously invalid tokens)
 */
export function validateTokenFormat(token: string): boolean {
  // Tokens should be at least 32 characters and contain only URL-safe base64 characters
  return token.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(token);
}

/**
 * Generate a secure token with expiration (for future use)
 */
export function generateTokenWithExpiration(expirationHours = 24 * 30): SecureToken {
  const token = generateShoppingListToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expirationHours);

  return {
    token,
    expiresAt
  };
}