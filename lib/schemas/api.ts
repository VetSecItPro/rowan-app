import { z } from 'zod';

/**
 * API Request/Response Schemas
 * Centralized validation for all API routes
 */

// Common validators
const uuidSchema = z.string().uuid('Invalid UUID format');
const emailSchema = z.string().email('Invalid email format');

// Budget schemas
export const CreateBudgetSchema = z.object({
  space_id: uuidSchema,
  monthly_budget: z.number().nonnegative('Budget must be non-negative'),
});

export const GetBudgetSchema = z.object({
  space_id: uuidSchema,
});

// Expense schemas
export const CreateExpenseSchema = z.object({
  space_id: uuidSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().max(50).optional(),
  payment_method: z.string().max(50).optional(),
  paid_by: z.string().max(100).optional(),
  date: z.string().datetime().optional(),
  paid_at: z.string().datetime().optional(),
  status: z.enum(['pending', 'paid', 'overdue']).default('pending'),
  due_date: z.string().datetime().optional(),
  recurring: z.boolean().default(false),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial().omit({ space_id: true });

// Project schemas
export const CreateProjectSchema = z.object({
  space_id: uuidSchema,
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold']).default('planning'),
  start_date: z.string().datetime().optional(),
  target_date: z.string().datetime().optional(),
  budget_amount: z.number().nonnegative().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ space_id: true });

// Space schemas
export const CreateSpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required').max(100, 'Space name must be 100 characters or less'),
});

export const InviteToSpaceSchema = z.object({
  space_id: uuidSchema,
  email: emailSchema,
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

// Recipe parsing schemas
export const ParseRecipeSchema = z.object({
  text: z.string().max(50000, 'Text too long (max 50KB)').optional(),
  imageBase64: z.string().max(5 * 1024 * 1024, 'Image too large (max 5MB)').optional(),
}).refine(
  (data) => data.text || data.imageBase64,
  { message: 'Either text or image must be provided' }
);

// Type exports
export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type GetBudgetInput = z.infer<typeof GetBudgetSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateSpaceInput = z.infer<typeof CreateSpaceSchema>;
export type InviteToSpaceInput = z.infer<typeof InviteToSpaceSchema>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;
export type ParseRecipeInput = z.infer<typeof ParseRecipeSchema>;
