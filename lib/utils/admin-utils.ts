/**
 * Admin utilities for checking user permissions
 */

const ADMIN_EMAILS = [
  'admin@example.com',
  'admin@example.com'
];

/**
 * Check if a user is an admin based on their email
 */
export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if a user has admin access based on user object
 */
export function hasAdminAccess(user: { email?: string } | null | undefined): boolean {
  if (!user?.email) return false;
  return isAdmin(user.email);
}