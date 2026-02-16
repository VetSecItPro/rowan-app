import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

/**
 * Shopping List Validation Schemas
 * Security: Prevents XSS, injection, and data integrity issues
 * Uses DOMPurify via sanitizePlainText for robust HTML sanitization
 */

// Create shopping list schema
export const createShoppingListSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim()
    .transform(sanitizePlainText),
});

// Update shopping list schema
export const updateShoppingListSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim()
    .transform(sanitizePlainText)
    .optional(),
  is_public: z.boolean().optional(),
});

// Shopping item schema
export const createShoppingItemSchema = z.object({
  list_id: z.string().uuid('Invalid list ID'),
  name: z.string()
    .min(1, 'Item name is required')
    .max(255, 'Item name must be less than 255 characters')
    .trim()
    .transform(sanitizePlainText),
  quantity: z.union([z.string(), z.number()])
    .transform((val) => (typeof val === 'number' ? String(val) : val))
    .pipe(z.string().max(50, 'Quantity must be less than 50 characters').trim())
    .optional()
    .nullable(),
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
  is_purchased: z.boolean().default(false),
});

// Update shopping item schema
export const updateShoppingItemSchema = z.object({
  name: z.string()
    .min(1, 'Item name is required')
    .max(255, 'Item name must be less than 255 characters')
    .trim()
    .transform(sanitizePlainText)
    .optional(),
  quantity: z.union([z.string(), z.number()])
    .transform((val) => (typeof val === 'number' ? String(val) : val))
    .pipe(z.string().max(50, 'Quantity must be less than 50 characters').trim())
    .optional()
    .nullable(),
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
  is_purchased: z.boolean().optional(),
});

// Type exports for TypeScript
export type CreateShoppingList = z.infer<typeof createShoppingListSchema>;
export type UpdateShoppingList = z.infer<typeof updateShoppingListSchema>;
export type CreateShoppingItem = z.infer<typeof createShoppingItemSchema>;
export type UpdateShoppingItem = z.infer<typeof updateShoppingItemSchema>;
