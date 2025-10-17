import { z } from 'zod';

// =====================================================
// ENUMS
// =====================================================

export const billFrequencies = [
  'one-time',
  'weekly',
  'bi-weekly',
  'monthly',
  'quarterly',
  'semi-annual',
  'annual',
] as const;

export const billStatuses = [
  'scheduled',
  'paid',
  'overdue',
  'cancelled',
] as const;

// =====================================================
// ZOD SCHEMAS FOR VALIDATION
// =====================================================

export const billFrequencySchema = z.enum(billFrequencies);
export const billStatusSchema = z.enum(billStatuses);

export const createBillSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  name: z
    .string()
    .min(1, 'Bill name is required')
    .max(255, 'Bill name too long')
    .trim(),
  amount: z
    .number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number')
    .max(999999999, 'Amount too large'),
  category: z
    .string()
    .max(100, 'Category name too long')
    .trim()
    .optional(),
  payee: z
    .string()
    .max(255, 'Payee name too long')
    .trim()
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes too long')
    .trim()
    .optional(),
  due_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  frequency: billFrequencySchema.default('monthly'),
  auto_pay: z.boolean().default(false),
  reminder_enabled: z.boolean().default(true),
  reminder_days_before: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(30, 'Cannot exceed 30 days')
    .default(3),
});

export const updateBillSchema = z.object({
  name: z
    .string()
    .min(1, 'Bill name cannot be empty')
    .max(255, 'Bill name too long')
    .trim()
    .optional(),
  amount: z
    .number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number')
    .max(999999999, 'Amount too large')
    .optional(),
  category: z
    .string()
    .max(100, 'Category name too long')
    .trim()
    .optional(),
  payee: z
    .string()
    .max(255, 'Payee name too long')
    .trim()
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes too long')
    .trim()
    .optional(),
  due_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format')
    .optional(),
  frequency: billFrequencySchema.optional(),
  status: billStatusSchema.optional(),
  auto_pay: z.boolean().optional(),
  reminder_enabled: z.boolean().optional(),
  reminder_days_before: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(30, 'Cannot exceed 30 days')
    .optional(),
});

// =====================================================
// TYPE INFERENCE FROM SCHEMAS
// =====================================================

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type BillFrequency = z.infer<typeof billFrequencySchema>;
export type BillStatus = z.infer<typeof billStatusSchema>;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validates and sanitizes bill creation input
 * @throws ZodError if validation fails
 */
export function validateCreateBill(data: unknown): CreateBillInput {
  return createBillSchema.parse(data);
}

/**
 * Validates and sanitizes bill update input
 * @throws ZodError if validation fails
 */
export function validateUpdateBill(data: unknown): UpdateBillInput {
  return updateBillSchema.parse(data);
}

/**
 * Safe validation that returns success/error instead of throwing
 */
export function safeValidateCreateBill(data: unknown) {
  return createBillSchema.safeParse(data);
}

/**
 * Safe validation that returns success/error instead of throwing
 */
export function safeValidateUpdateBill(data: unknown) {
  return updateBillSchema.safeParse(data);
}
