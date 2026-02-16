import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Meal type enum
const mealTypeEnum = z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']);

// Recipe reference schema
const recipeReferenceSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  image_url: z.string().url().optional().nullable(),
}).optional().nullable();

// Base meal schema
export const mealBaseSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  meal_type: mealTypeEnum,
  scheduled_date: z.string()
    .refine(val => z.string().datetime().safeParse(val).success || z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(val).success, 'Invalid date format'),
  recipe_id: z.string().uuid().optional().nullable(),
  name: z.string().max(200, 'Name must be less than 200 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  servings: z.number().int().min(1).max(100).optional().nullable(),
  recipe_data: recipeReferenceSchema,
  assigned_to: z.string().uuid().optional().nullable(),
});

// Create meal schema
export const createMealSchema = mealBaseSchema;

// Update meal schema (all fields optional except space_id)
export const updateMealSchema = mealBaseSchema.partial().extend({
  space_id: z.string().uuid('Invalid space ID'),
});

// Helper to validate and sanitize meal input
export function validateAndSanitizeMeal(data: unknown): z.infer<typeof createMealSchema> {
  const parsed = createMealSchema.parse(data);

  return {
    ...parsed,
    name: parsed.name ? sanitizePlainText(parsed.name) : null,
    notes: parsed.notes ? sanitizePlainText(parsed.notes) : null,
  };
}

// Type exports
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
