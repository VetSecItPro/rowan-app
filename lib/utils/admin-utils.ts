/**
 * Admin utilities for checking user permissions (client-side)
 *
 * IMPORTANT: For server-side checks, use lib/utils/admin-check.ts which
 * uses the database RPC function for authoritative admin verification.
 *
 * This file provides quick client-side UI checks using environment variables.
 * The authoritative source of truth is the admin_users database table.
 */

/**
 * Get admin emails from environment variable
 * Format: comma-separated list of emails
 * Example: NEXT_PUBLIC_ADMIN_EMAILS=admin1@example.com,admin2@example.com
 */
function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  if (!adminEmailsEnv) return [];
  return adminEmailsEnv.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
}

/**
 * Check if a user is an admin based on their email (client-side quick check)
 * Note: This is for UI purposes only. Server-side operations should use
 * the database-based isAdmin() from admin-check.ts
 */
export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Check if a user has admin access based on user object (client-side quick check)
 * Note: This is for UI purposes only. Server-side operations should use
 * the database-based isAdmin() from admin-check.ts
 */
export function hasAdminAccess(user: { email?: string } | null | undefined): boolean {
  if (!user?.email) return false;
  return isAdmin(user.email);
}