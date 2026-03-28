/**
 * Shared constants for middleware modules.
 *
 * Centralised here so that middleware.ts and csrf.ts (and any future consumers)
 * reference the same canonical list — no drift.
 */

export const PROTECTED_PATHS = [
  '/dashboard', '/tasks', '/calendar', '/messages', '/reminders',
  '/shopping', '/meals', '/projects', '/recipes', '/goals', '/settings',
  '/invitations', '/feedback', '/expenses', '/budget', '/budget-setup',
  '/location', '/rewards', '/achievements', '/year-in-review', '/reports',
];
