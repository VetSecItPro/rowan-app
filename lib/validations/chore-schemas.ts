import { z } from 'zod';

// Base chore schema
export const choreBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').trim().optional().nullable(),
  space_id: z.string().uuid('Invalid space ID'),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().uuid('Invalid user ID').optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  estimated_minutes: z.number().int().min(0).max(10000).optional().nullable(),
  category: z.string().max(100).trim().optional().nullable(),
  recurrence_pattern: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional().nullable(),
  recurrence_interval: z.number().int().min(1).max(365).optional().nullable(),
  location: z.string().max(100).trim().optional().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().nullable(),
});

// Create chore schema
export const createChoreSchema = choreBaseSchema.extend({
  created_by: z.string().uuid('Invalid user ID'),
});

// Update chore schema (all fields optional)
export const updateChoreSchema = choreBaseSchema.partial().extend({
  completed_at: z.string().datetime().optional().nullable(),
  updated_at: z.string().datetime().optional(),
});

// Chore rotation schema
export const choreRotationSchema = z.object({
  chore_id: z.string().uuid(),
  space_id: z.string().uuid(),
  member_ids: z.array(z.string().uuid()).min(2, 'At least 2 members required for rotation'),
  rotation_type: z.enum(['round-robin', 'random', 'skill-based']).default('round-robin'),
  rotation_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).default('weekly'),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid(),
});

// Chore checklist schema
export const choreChecklistSchema = z.object({
  chore_id: z.string().uuid(),
  title: z.string().min(1).max(200).trim(),
  items: z.array(
    z.object({
      title: z.string().min(1).max(200).trim(),
      description: z.string().max(500).trim().optional(),
      is_completed: z.boolean().default(false),
      sort_order: z.number().int().min(0).default(0),
    })
  ).max(50, 'Maximum 50 checklist items'),
  created_by: z.string().uuid(),
});

// Chore template schema
export const choreTemplateSchema = z.object({
  space_id: z.string().uuid(),
  name: z.string().min(1).max(100).trim(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  category: z.string().max(100).trim().optional(),
  estimated_minutes: z.number().int().min(0).max(10000).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tags: z.array(z.string().max(50).trim()).max(20).optional(),
  checklist_items: z.array(
    z.object({
      title: z.string().min(1).max(200).trim(),
      description: z.string().max(500).trim().optional(),
      sort_order: z.number().int().min(0).default(0),
    })
  ).max(50).optional(),
  created_by: z.string().uuid(),
  is_favorite: z.boolean().default(false),
});

// Chore completion verification schema
export const choreCompletionSchema = z.object({
  chore_id: z.string().uuid(),
  completed_by: z.string().uuid(),
  completed_at: z.string().datetime(),
  verification_photos: z.array(z.string().url()).max(5).optional(),
  notes: z.string().max(1000).trim().optional(),
  quality_rating: z.number().int().min(1).max(5).optional(),
});

// Bulk chore operations
export const bulkUpdateChoresSchema = z.object({
  chore_ids: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    category: z.string().max(100).trim().optional().nullable(),
  }),
});

export const bulkDeleteChoresSchema = z.object({
  chore_ids: z.array(z.string().uuid()).min(1).max(100),
  space_id: z.string().uuid(),
});

// Helper function to sanitize HTML input
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Helper to validate and sanitize chore input
export function validateAndSanitizeChore(data: unknown): z.infer<typeof createChoreSchema> {
  const parsed = createChoreSchema.parse(data);

  return {
    ...parsed,
    title: sanitizeString(parsed.title),
    description: parsed.description ? sanitizeString(parsed.description) : null,
    category: parsed.category ? sanitizeString(parsed.category) : null,
    location: parsed.location ? sanitizeString(parsed.location) : null,
  };
}

// Validation for chore completion with required fields
export const validateChoreCompletion = (data: unknown) => {
  const schema = z.object({
    chore_id: z.string().uuid(),
    completed_by: z.string().uuid(),
  });

  return schema.parse(data);
};

// Type exports
export type CreateChoreInput = z.infer<typeof createChoreSchema>;
export type UpdateChoreInput = z.infer<typeof updateChoreSchema>;
export type ChoreRotationInput = z.infer<typeof choreRotationSchema>;
export type ChoreTemplateInput = z.infer<typeof choreTemplateSchema>;
export type ChoreCompletionInput = z.infer<typeof choreCompletionSchema>;
export type BulkUpdateChoresInput = z.infer<typeof bulkUpdateChoresSchema>;
