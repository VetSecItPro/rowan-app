import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Reminder priority and recurrence enums
const reminderPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
const reminderRecurrenceEnum = z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']);
const reminderStatusEnum = z.enum(['active', 'snoozed', 'completed', 'dismissed']);

// Base reminder schema
export const reminderBaseSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  due_date: z.string().optional().nullable()
    .transform(val => val === '' ? null : val)
    .refine(val => val === null || val === undefined || z.string().datetime().safeParse(val).success || z.string().regex(/^\d{4}-\d{2}-\d{2}/).safeParse(val).success, 'Invalid date format'),
  priority: reminderPriorityEnum.default('medium'),
  recurrence: reminderRecurrenceEnum.default('none'),
  status: reminderStatusEnum.default('active'),
  assigned_to: z.string().uuid().optional().nullable(),
  notification_time: z.string().optional().nullable()
    .transform(val => val === '' ? null : val),
  snoozed_until: z.string().datetime().optional().nullable(),
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
