import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize search input for SQL ILIKE queries to prevent injection
 * Escapes special PostgreSQL pattern matching characters: %, _, \
 *
 * @param input - User search input string
 * @returns Sanitized string safe for use in ILIKE queries
 */
export function sanitizeSearchInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Escape backslashes first (must be first to avoid double-escaping)
    .replace(/\\/g, '\\\\')
    // Escape SQL ILIKE wildcards
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    // Trim whitespace
    .trim()
    // Limit length to prevent DOS
    .slice(0, 100);
}