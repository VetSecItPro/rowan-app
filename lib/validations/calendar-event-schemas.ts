import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Calendar event recurrence enum
const recurrenceTypeEnum = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);

// Base calendar event schema
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
  recurrence: recurrenceTypeEnum.default('none'),
  recurrence_end_date: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().optional()
  ),
  color: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().max(50).optional()
  ),
  reminder_minutes: z.number().int().min(0).max(10080).optional(), // max 1 week
  attendees: z.array(z.string().uuid()).optional(),
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
