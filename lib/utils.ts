import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize search input for SQL ILIKE queries AND PostgREST filter syntax
 *
 * Security: Prevents both SQL injection and PostgREST filter injection
 * - Escapes SQL LIKE wildcards: %, _, \
 * - Removes PostgREST special characters: . , ( ) that could break .or() filter syntax
 * - Limits length to prevent DoS attacks
 *
 * @param input - User search input string
 * @returns Sanitized string safe for use in ILIKE queries within PostgREST filters
 */
export function sanitizeSearchInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove PostgREST filter syntax special characters that could break .or() queries
    // These characters are used by PostgREST for column.operator syntax and condition grouping
    .replace(/[.,()]/g, ' ')
    // Escape backslashes first (must be first to avoid double-escaping)
    .replace(/\\/g, '\\\\')
    // Escape SQL ILIKE wildcards
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim()
    // Limit length to prevent DoS
    .slice(0, 100);
}