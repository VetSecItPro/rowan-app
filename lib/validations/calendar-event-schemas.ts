import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

/**
 * Calendar Event Validation Schemas
 *
 * Maps to the `events` table in the database. Field names must match DB columns:
 * - is_recurring (boolean) + recurrence_pattern (text) -- NOT "recurrence"
 * - custom_color (text) -- NOT "color"
 * - all_day (boolean)
 *
 * Fields that do NOT exist in the DB and are intentionally excluded:
 * - recurrence_end_date, reminder_minutes, attendees
 */

// Recurrence pattern values stored in the recurrence_pattern column
const recurrencePatternEnum = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);

// Base calendar event schema - field names match DB columns
export const calendarEventBaseSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().max(2000, 'Description must be less than 2000 characters').trim().optional()
  ),
  location: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().max(500, 'Location must be less than 500 characters').trim().optional()
  ),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().optional()
  ),
  all_day: z.boolean().default(false),
  // DB columns: is_recurring (boolean) + recurrence_pattern (text)
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.preprocess(
    (val) => (val === '' || val === null || val === 'none') ? undefined : val,
    recurrencePatternEnum.optional()
  ),
  custom_color: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().max(50).optional()
  ),
  event_type: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().optional()
  ),
  category: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.enum(['work', 'personal', 'family', 'health', 'social']).optional()
  ),
  assigned_to: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().uuid().optional()
  ),
});

// Create calendar event schema
export const createCalendarEventSchema = calendarEventBaseSchema;

// Update calendar event schema (all fields optional except id validation happens via URL param)
export const updateCalendarEventSchema = calendarEventBaseSchema.partial().omit({ space_id: true });

// Helper to validate and sanitize calendar event input
export function validateAndSanitizeCalendarEvent(data: unknown): z.infer<typeof createCalendarEventSchema> {
  const parsed = createCalendarEventSchema.parse(data);

  return {
    ...parsed,
    title: sanitizePlainText(parsed.title),
    description: parsed.description ? sanitizePlainText(parsed.description) : undefined,
    location: parsed.location ? sanitizePlainText(parsed.location) : undefined,
  };
}

// Helper to validate and sanitize calendar event updates
export function validateAndSanitizeCalendarEventUpdate(data: unknown): z.infer<typeof updateCalendarEventSchema> {
  const parsed = updateCalendarEventSchema.parse(data);

  return {
    ...parsed,
    title: parsed.title ? sanitizePlainText(parsed.title) : undefined,
    description: parsed.description ? sanitizePlainText(parsed.description) : undefined,
    location: parsed.location ? sanitizePlainText(parsed.location) : undefined,
  };
}

// Type exports
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
