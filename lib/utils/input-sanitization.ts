/**
 * Input Sanitization Utilities
 *
 * Security utilities for sanitizing user input to prevent:
 * - ReDoS (Regular Expression Denial of Service) attacks
 * - SQL injection via LIKE/ILIKE wildcards
 * - Excessive input lengths causing performance issues
 */

/**
 * Sanitize search input for use in SQL LIKE/ILIKE queries
 *
 * This function:
 * 1. Limits input length to prevent ReDoS attacks
 * 2. Escapes SQL wildcards (% and _) to prevent injection
 * 3. Trims whitespace
 *
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized string safe for LIKE/ILIKE queries
 *
 * @example
 * // In a service function:
 * const safeQuery = sanitizeSearchInput(userQuery);
 * query.ilike('column', `%${safeQuery}%`);
 */
export function sanitizeSearchInput(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .slice(0, maxLength)
    // Escape SQL LIKE wildcards to prevent injection
    // % matches any sequence of characters
    // _ matches any single character
    .replace(/[%_]/g, '\\$&');
}

/**
 * Sanitize search input and return empty string if result is too short
 *
 * @param input - Raw user input
 * @param minLength - Minimum length after sanitization (default: 1)
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized string or empty string if too short
 */
export function sanitizeSearchInputStrict(
  input: string,
  minLength: number = 1,
  maxLength: number = 100
): string {
  const sanitized = sanitizeSearchInput(input, maxLength);
  return sanitized.length >= minLength ? sanitized : '';
}

/**
 * Check if a search query is valid (non-empty after sanitization)
 *
 * @param input - Raw user input
 * @param minLength - Minimum length (default: 1)
 * @returns boolean indicating if the query is valid
 */
export function isValidSearchQuery(input: string, minLength: number = 1): boolean {
  const sanitized = sanitizeSearchInput(input);
  return sanitized.length >= minLength;
}

/**
 * Escape special RegExp characters in a string to prevent ReDoS attacks
 *
 * This function escapes all special regex characters to make user input safe
 * for use in RegExp constructors, preventing Regular Expression Denial of
 * Service (ReDoS) attacks.
 *
 * @param str - String to escape
 * @returns String with regex special characters escaped
 *
 * @example
 * const userInput = "location*"; // Contains regex metacharacter *
 * const pattern = new RegExp(`at\\s+${escapeRegExp(userInput)}`, 'i');
 * // Result: Regex with escaped metacharacters (safe)
 */
export function escapeRegExp(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  // Escape all regex special characters: . * + ? ^ $ { } ( ) | [ ] \
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
