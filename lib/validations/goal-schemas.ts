import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Goal status enum
const goalStatusEnum = z.enum(['active', 'completed', 'paused', 'archived']);
const goalCategoryEnum = z.enum(['personal', 'family', 'health', 'financial', 'career', 'education', 'other']);

// Base goal schema
// NOTE: `category` maps to the DB column `category` (not `goal_type`).
// `milestones` and `reminder_frequency` are NOT DB columns — milestones live in `goal_milestones` table.
export const goalBaseSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
  description: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().max(2000, 'Description must be less than 2000 characters').trim().optional()
  ),
  category: goalCategoryEnum.default('personal'),
  status: goalStatusEnum.default('active'),
  target_date: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : val,
    z.string().optional()
  ),
  progress: z.number().min(0, 'Progress must be at least 0').max(100, 'Progress cannot exceed 100').default(0),
  visibility: z.enum(['private', 'shared']).optional(),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
});

// Create goal schema
export const createGoalSchema = goalBaseSchema.extend({
  created_by: z.string().uuid('Invalid user ID'),
});

// Update goal schema (all fields optional)
export const updateGoalSchema = goalBaseSchema.partial();

// Helper to validate and sanitize goal input
export function validateAndSanitizeGoal(data: unknown): z.infer<typeof createGoalSchema> {
  const parsed = createGoalSchema.parse(data);

  return {
    ...parsed,
    title: sanitizePlainText(parsed.title),
    description: parsed.description ? sanitizePlainText(parsed.description) : undefined,
  };
}

// Type exports
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
