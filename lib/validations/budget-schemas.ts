import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Budget category enums (matching expense categories)
const budgetCategoryEnum = z.enum([
  'groceries', 'utilities', 'rent', 'mortgage', 'transportation',
  'entertainment', 'dining', 'healthcare', 'insurance', 'subscriptions',
  'education', 'childcare', 'pets', 'clothing', 'personal', 'gifts',
  'travel', 'home', 'savings', 'emergency', 'other'
]);

// Budget period enum
const budgetPeriodEnum = z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']);

// Category budget schema for breakdown
const categoryBudgetSchema = z.object({
  category: budgetCategoryEnum,
  amount: z.number().min(0).max(99999999.99),
  notes: z.string().max(500).optional().nullable(),
});

// Base budget schema
export const budgetBaseSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  monthly_budget: z.union([
    z.number().min(0, 'Budget must be positive').max(99999999.99, 'Budget too large'),
    z.string().transform(val => {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) throw new Error('Invalid budget amount');
      return parsed;
    })
  ]).refine(val => typeof val === 'number' && val >= 0, 'Budget must be a positive number'),
  period: budgetPeriodEnum.default('monthly'),
  start_date: z.string().optional().nullable()
    .transform(val => val === '' ? null : val)
    .refine(val => val === null || z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(val).success, 'Invalid date format'),
  end_date: z.string().optional().nullable()
    .transform(val => val === '' ? null : val)
    .refine(val => val === null || z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(val).success, 'Invalid date format'),
  category_budgets: z.array(categoryBudgetSchema).optional().nullable(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  alert_threshold: z.number().min(0).max(100).default(80), // Percentage to trigger warning
  is_active: z.boolean().default(true),
});

// Create budget schema
export const createBudgetSchema = budgetBaseSchema;

// Update budget schema (all fields optional except space_id)
export const updateBudgetSchema = budgetBaseSchema.partial().extend({
  space_id: z.string().uuid('Invalid space ID'),
});

// Helper to validate and sanitize budget input
export function validateAndSanitizeBudget(data: unknown): z.infer<typeof createBudgetSchema> {
  const parsed = createBudgetSchema.parse(data);

  return {
    ...parsed,
    notes: parsed.notes ? sanitizePlainText(parsed.notes) : null,
  };
}

// Type exports
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
