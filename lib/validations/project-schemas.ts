import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Project status enum — matches DB CHECK constraint and project-tracking-service.ts
// NOTE: DB uses 'in-progress' (hyphenated), NOT 'active' or 'in_progress'
const projectStatusEnum = z.enum(['planning', 'in-progress', 'on-hold', 'completed', 'cancelled']);
const projectPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

// Base project schema
// NOTE: Field names must match DB columns exactly.
// - `target_date` (not `end_date`) maps to DB column
// - `budget_amount` (not `budget`) maps to DB column
// - `color`, `icon`, `assigned_to` do NOT exist as DB columns — removed
export const projectBaseSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  status: projectStatusEnum.default('planning'),
  priority: projectPriorityEnum.default('medium'),
  start_date: z.string().optional().nullable()
    .transform(val => val === '' ? null : val)
    .refine(val => val === null || z.string().datetime().safeParse(val).success || z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(val).success, 'Invalid date format'),
  target_date: z.string().optional().nullable()
    .transform(val => val === '' ? null : val)
    .refine(val => val === null || z.string().datetime().safeParse(val).success || z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(val).success, 'Invalid date format'),
  budget_amount: z.number().min(0).max(99999999.99).optional().nullable(),
  location: z.string().max(200).optional().nullable()
    .transform(val => val === '' ? null : val),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
});

// Create project schema
export const createProjectSchema = projectBaseSchema.extend({
  created_by: z.string().uuid('Invalid user ID'),
});

// Update project schema (all fields optional)
export const updateProjectSchema = projectBaseSchema.partial();

// Helper to validate and sanitize project input
export function validateAndSanitizeProject(data: unknown): z.infer<typeof createProjectSchema> {
  const parsed = createProjectSchema.parse(data);

  return {
    ...parsed,
    name: sanitizePlainText(parsed.name),
    description: parsed.description ? sanitizePlainText(parsed.description) : null,
    location: parsed.location ? sanitizePlainText(parsed.location) : null,
  };
}

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
