import { z } from 'zod';

// =====================================================
// ENUM SCHEMAS
// =====================================================

export const splitTypeSchema = z.enum(['equal', 'percentage', 'fixed', 'income-based']);

export const ownershipTypeSchema = z.enum(['shared', 'yours', 'theirs']);

export const splitStatusSchema = z.enum(['pending', 'partially-paid', 'settled']);

// =====================================================
// UPDATE SPLIT EXPENSE SCHEMA
// =====================================================

export const updateSplitExpenseSchema = z
  .object({
    ownership: ownershipTypeSchema.optional(),
    split_type: splitTypeSchema.optional(),
    split_percentage_user1: z
      .number()
      .min(0, 'Percentage cannot be negative')
      .max(100, 'Percentage cannot exceed 100')
      .optional(),
    split_percentage_user2: z
      .number()
      .min(0, 'Percentage cannot be negative')
      .max(100, 'Percentage cannot exceed 100')
      .optional(),
    split_amount_user1: z
      .number()
      .min(0, 'Amount cannot be negative')
      .max(999999999, 'Amount too large')
      .optional(),
    split_amount_user2: z
      .number()
      .min(0, 'Amount cannot be negative')
      .max(999999999, 'Amount too large')
      .optional(),
    is_split: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If percentages are provided, they should sum to 100
      if (data.split_percentage_user1 !== undefined && data.split_percentage_user2 !== undefined) {
        const sum = data.split_percentage_user1 + data.split_percentage_user2;
        return Math.abs(sum - 100) < 0.01; // Allow for floating point errors
      }
      return true;
    },
    {
      message: 'Split percentages must sum to 100',
      path: ['split_percentage_user1'],
    }
  );

// =====================================================
// CREATE SETTLEMENT SCHEMA
// =====================================================

export const createSettlementSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  from_user_id: z.string().uuid('Invalid from user ID'),
  to_user_id: z.string().uuid('Invalid to user ID'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(999999999, 'Amount too large')
    .refine((val) => Math.round(val * 100) / 100 === val, {
      message: 'Amount can only have 2 decimal places',
    }),
  settlement_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  payment_method: z
    .string()
    .min(1, 'Payment method is required')
    .max(100, 'Payment method too long')
    .trim()
    .optional(),
  reference_number: z.string().max(100, 'Reference number too long').trim().optional(),
  notes: z.string().max(1000, 'Notes too long').trim().optional(),
  expense_ids: z.array(z.string().uuid('Invalid expense ID')).max(100, 'Too many expenses').optional(),
  created_by: z.string().uuid('Invalid creator user ID'),
});

// =====================================================
// UPDATE INCOMES SCHEMA
// =====================================================

export const updateIncomesSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  user1_id: z.string().uuid('Invalid user 1 ID'),
  user1_income: z
    .number()
    .min(0, 'Income cannot be negative')
    .max(10000000, 'Income too large'),
  user2_id: z.string().uuid('Invalid user 2 ID'),
  user2_income: z
    .number()
    .min(0, 'Income cannot be negative')
    .max(10000000, 'Income too large'),
});

// =====================================================
// SETTLE SPLIT SCHEMA
// =====================================================

export const settleSplitSchema = z.object({
  split_id: z.string().uuid('Invalid split ID'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(999999999, 'Amount too large')
    .optional(),
});

// =====================================================
// INCOME-BASED SPLIT CALCULATION SCHEMA
// =====================================================

export const calculateIncomeBasedSplitSchema = z.object({
  total_amount: z.number().positive('Total amount must be positive').max(999999999, 'Amount too large'),
  user1_income: z.number().min(0, 'Income cannot be negative').max(10000000, 'Income too large'),
  user2_income: z.number().min(0, 'Income cannot be negative').max(10000000, 'Income too large'),
});

// =====================================================
// SAFE VALIDATION FUNCTIONS
// =====================================================

export function safeValidateUpdateSplitExpense(data: unknown) {
  return updateSplitExpenseSchema.safeParse(data);
}

export function safeValidateCreateSettlement(data: unknown) {
  return createSettlementSchema.safeParse(data);
}

export function safeValidateUpdateIncomes(data: unknown) {
  return updateIncomesSchema.safeParse(data);
}

export function safeValidateSettleSplit(data: unknown) {
  return settleSplitSchema.safeParse(data);
}

export function safeValidateCalculateIncomeBasedSplit(data: unknown) {
  return calculateIncomeBasedSplitSchema.safeParse(data);
}

// =====================================================
// TYPE EXPORTS
// =====================================================

export type UpdateSplitExpenseInput = z.infer<typeof updateSplitExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type UpdateIncomesInput = z.infer<typeof updateIncomesSchema>;
export type SettleSplitInput = z.infer<typeof settleSplitSchema>;
export type CalculateIncomeBasedSplitInput = z.infer<typeof calculateIncomeBasedSplitSchema>;
export type SplitType = z.infer<typeof splitTypeSchema>;
export type OwnershipType = z.infer<typeof ownershipTypeSchema>;
export type SplitStatus = z.infer<typeof splitStatusSchema>;
