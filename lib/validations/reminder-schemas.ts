import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

/**
 * Reminder Validation Schemas
 *
 * Maps to the `reminders` table in the database. Field names must match DB columns:
 * - reminder_time (timestamptz) -- the time the reminder fires
 * - remind_at (timestamptz) -- legacy/backwards-compat field, populated from reminder_time
 * - is_recurring (boolean) + recurrence_pattern (text) -- NOT "recurrence"
 * - snooze_until (timestamptz) -- NOT "snoozed_until"
 * - completed (boolean) -- NOT "is_complete"
 *
 * Fields that do NOT exist in the DB:
 * - due_date (use reminder_time instead)
 * - notification_time (use reminder_time instead)
 * - snoozed_until (DB column is snooze_until)
 */

// Reminder priority and recurrence enums
const reminderPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
const reminderRecurrenceEnum = z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']);
const reminderStatusEnum = z.enum(['active', 'snoozed', 'completed', 'dismissed']);

// Base reminder schema - field names match DB columns
export const reminderBaseSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  // DB column: reminder_time (timestamptz) - when the reminder should fire
  reminder_time: z.string().optional().nullable()
    .transform(val => val === '' ? null : val)
    .refine(val => val === null || val === undefined || z.string().datetime().safeParse(val).success || z.string().regex(/^\d{4}-\d{2}-\d{2}/).safeParse(val).success, 'Invalid date format'),
  priority: reminderPriorityEnum.default('medium'),
  // DB columns: is_recurring (boolean) + recurrence_pattern (text)
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.preprocess(
    (val) => (val === '' || val === null || val === 'none') ? undefined : val,
    reminderRecurrenceEnum.optional()
  ),
  status: reminderStatusEnum.default('active'),
  assigned_to: z.string().uuid().optional().nullable(),
  // DB column: snooze_until (NOT snoozed_until)
  snooze_until: z.string().datetime().optional().nullable(),
  category: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.enum(['bills', 'health', 'work', 'personal', 'household']).optional()
  ),
  emoji: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().optional()
  ),
  reminder_type: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.enum(['time', 'location']).optional()
  ),
  location: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().max(500).optional()
  ),
  repeat_pattern: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().optional()
  ),
  repeat_days: z.array(z.number()).optional().nullable(),
});

// Create reminder schema
export const createReminderSchema = reminderBaseSchema.extend({
  created_by: z.string().uuid('Invalid user ID'),
});

// Update reminder schema (all fields optional)
export const updateReminderSchema = reminderBaseSchema.partial();

// Helper to validate and sanitize reminder input
export function validateAndSanitizeReminder(data: unknown): z.infer<typeof createReminderSchema> {
  const parsed = createReminderSchema.parse(data);

  return {
    ...parsed,
    title: sanitizePlainText(parsed.title),
    description: parsed.description ? sanitizePlainText(parsed.description) : null,
  };
}

// Type exports
export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
