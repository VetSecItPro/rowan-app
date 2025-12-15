import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Feedback type and priority enums
const feedbackTypeEnum = z.enum(['bug', 'feature', 'improvement', 'question', 'other']);
const feedbackPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);
const feedbackStatusEnum = z.enum(['new', 'acknowledged', 'in_progress', 'resolved', 'closed', 'wont_fix']);

// Base feedback schema
export const feedbackBaseSchema = z.object({
  type: feedbackTypeEnum.default('other'),
  priority: feedbackPriorityEnum.default('medium'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),
  title: z.string().max(200, 'Title must be less than 200 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  page_url: z.string().url().optional().nullable(),
  user_agent: z.string().max(500).optional().nullable(),
  screenshot_urls: z.array(z.string().url()).max(5).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// Create feedback schema (user submission)
export const createFeedbackSchema = feedbackBaseSchema;

// Admin update feedback schema
export const updateFeedbackSchema = feedbackBaseSchema.partial().extend({
  status: feedbackStatusEnum.optional(),
  admin_notes: z.string().max(2000).trim().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
});

// Helper to validate and sanitize feedback input
export function validateAndSanitizeFeedback(data: unknown): z.infer<typeof createFeedbackSchema> {
  const parsed = createFeedbackSchema.parse(data);

  return {
    ...parsed,
    description: sanitizePlainText(parsed.description),
    title: parsed.title ? sanitizePlainText(parsed.title) : null,
  };
}

// Type exports
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
