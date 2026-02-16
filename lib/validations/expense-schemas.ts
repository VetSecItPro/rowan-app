import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Expense status and category enums
const expenseStatusEnum = z.enum(['pending', 'paid', 'overdue', 'cancelled']);
const expenseCategoryEnum = z.enum([
  'groceries', 'utilities', 'rent', 'mortgage', 'transportation',
  'entertainment', 'dining', 'healthcare', 'insurance', 'subscriptions',
  'education', 'childcare', 'pets', 'clothing', 'personal', 'gifts',
  'travel', 'home', 'other'
]);
const paymentMethodEnum = z.enum(['cash', 'credit', 'debit', 'bank_transfer', 'check', 'other']);
const recurringFrequencyEnum = z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']);

// Base expense schema
// NOTE: Field names must match DB columns exactly.
// - `paid_by` is uuid in DB (foreign key to users)
// - `recurring` is boolean in DB; recurrence type goes in `recurring_frequency`
// - `receipt_id` is uuid FK in DB (not a URL)
export const expenseBaseSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
  amount: z.union([
    z.number().min(0, 'Amount must be positive').max(99999999.99, 'Amount too large'),
    z.string().transform(val => {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) throw new Error('Invalid amount');
      return parsed;
    })
  ]).refine(val => typeof val === 'number' && val >= 0, 'Amount must be a positive number'),
  category: expenseCategoryEnum.optional().nullable(),
  payment_method: paymentMethodEnum.optional().nullable(),
  paid_by: z.string().uuid('Invalid user ID').optional().nullable(),
  status: expenseStatusEnum.default('pending'),
  date: z.string().optional().nullable()
    .transform(val => val === '' ? null : val),
  due_date: z.string().optional().nullable()
    .transform(val => val === '' ? null : val)
    .refine(val => val === null || z.string().datetime().safeParse(val).success || z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(val).success, 'Invalid date format'),
  recurring: z.boolean().default(false),
  recurring_frequency: recurringFrequencyEnum.optional().nullable(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  project_id: z.string().uuid('Invalid project ID').optional().nullable(),
  split_type: z.string().max(50).optional().nullable(),
});

// Create expense schema
export const createExpenseSchema = expenseBaseSchema;

// Update expense schema (all fields optional)
export const updateExpenseSchema = expenseBaseSchema.partial();

// Helper to validate and sanitize expense input
export function validateAndSanitizeExpense(data: unknown): z.infer<typeof createExpenseSchema> {
  const parsed = createExpenseSchema.parse(data);

  return {
    ...parsed,
    title: sanitizePlainText(parsed.title),
    description: parsed.description ? sanitizePlainText(parsed.description) : null,
    notes: parsed.notes ? sanitizePlainText(parsed.notes) : null,
  };
}

// Type exports
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
