import { z } from 'zod';

// =====================================================
// ENUM SCHEMAS
// =====================================================

export const recurrenceFrequencySchema = z.enum([
  'daily', 'weekly', 'bi-weekly', 'monthly', 'bi-monthly', 'quarterly', 'semi-annual', 'annual'
]);

export const detectionMethodSchema = z.enum(['ml-analysis', 'manual', 'rule-based']);

// =====================================================
// PATTERN ACTIONS SCHEMA
// =====================================================

export const confirmPatternSchema = z.object({
  pattern_id: z.string().uuid('Invalid pattern ID'),
  space_id: z.string().uuid('Invalid space ID'),
});

export const ignorePatternSchema = z.object({
  pattern_id: z.string().uuid('Invalid pattern ID'),
  space_id: z.string().uuid('Invalid space ID'),
});

export const createExpenseFromPatternSchema = z.object({
  pattern_id: z.string().uuid('Invalid pattern ID'),
  space_id: z.string().uuid('Invalid space ID'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(999999999, 'Amount too large')
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  description: z.string().max(500, 'Description too long').trim().optional(),
});

// =====================================================
// UPDATE PATTERN SCHEMA
// =====================================================

export const updatePatternSchema = z.object({
  pattern_id: z.string().uuid('Invalid pattern ID'),
  updates: z.object({
    pattern_name: z.string().min(1, 'Pattern name is required').max(255, 'Pattern name too long').trim().optional(),
    merchant_name: z.string().max(255, 'Merchant name too long').trim().optional().nullable(),
    category: z.string().max(100, 'Category too long').trim().optional().nullable(),
    frequency: recurrenceFrequencySchema.optional(),
    average_amount: z
      .number()
      .positive('Amount must be positive')
      .max(999999999, 'Amount too large')
      .optional(),
    next_expected_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      .optional()
      .nullable(),
    next_expected_amount: z
      .number()
      .positive('Amount must be positive')
      .max(999999999, 'Amount too large')
      .optional()
      .nullable(),
    user_confirmed: z.boolean().optional(),
    user_ignored: z.boolean().optional(),
  }),
});

// =====================================================
// DELETE PATTERN SCHEMA
// =====================================================

export const deletePatternSchema = z.object({
  pattern_id: z.string().uuid('Invalid pattern ID'),
  space_id: z.string().uuid('Invalid space ID'),
});

// =====================================================
// ANALYZE PATTERNS SCHEMA
// =====================================================

export const analyzePatternsSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  min_confidence: z
    .number()
    .min(0, 'Minimum confidence cannot be negative')
    .max(100, 'Minimum confidence cannot exceed 100')
    .optional(),
});

// =====================================================
// GET PATTERNS SCHEMA
// =====================================================

export const getPatternsSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  include_ignored: z.boolean().optional(),
  include_confirmed: z.boolean().optional(),
  min_confidence: z
    .number()
    .min(0, 'Minimum confidence cannot be negative')
    .max(100, 'Minimum confidence cannot exceed 100')
    .optional(),
  frequency: recurrenceFrequencySchema.optional(),
});

// =====================================================
// DUPLICATE DETECTION SCHEMA
// =====================================================

export const detectDuplicatesSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  similarity_threshold: z
    .number()
    .min(0, 'Threshold cannot be negative')
    .max(100, 'Threshold cannot exceed 100')
    .optional(),
});

// =====================================================
// SAFE VALIDATION FUNCTIONS
// =====================================================

export function safeValidateConfirmPattern(data: unknown) {
  return confirmPatternSchema.safeParse(data);
}

export function safeValidateIgnorePattern(data: unknown) {
  return ignorePatternSchema.safeParse(data);
}

export function safeValidateCreateExpenseFromPattern(data: unknown) {
  return createExpenseFromPatternSchema.safeParse(data);
}

export function safeValidateUpdatePattern(data: unknown) {
  return updatePatternSchema.safeParse(data);
}

export function safeValidateDeletePattern(data: unknown) {
  return deletePatternSchema.safeParse(data);
}

export function safeValidateAnalyzePatterns(data: unknown) {
  return analyzePatternsSchema.safeParse(data);
}

export function safeValidateGetPatterns(data: unknown) {
  return getPatternsSchema.safeParse(data);
}

export function safeValidateDetectDuplicates(data: unknown) {
  return detectDuplicatesSchema.safeParse(data);
}

// =====================================================
// TYPE EXPORTS
// =====================================================

export type ConfirmPatternInput = z.infer<typeof confirmPatternSchema>;
export type IgnorePatternInput = z.infer<typeof ignorePatternSchema>;
export type CreateExpenseFromPatternInput = z.infer<typeof createExpenseFromPatternSchema>;
export type UpdatePatternInput = z.infer<typeof updatePatternSchema>;
export type DeletePatternInput = z.infer<typeof deletePatternSchema>;
export type AnalyzePatternsInput = z.infer<typeof analyzePatternsSchema>;
export type GetPatternsInput = z.infer<typeof getPatternsSchema>;
export type DetectDuplicatesInput = z.infer<typeof detectDuplicatesSchema>;
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;
export type DetectionMethod = z.infer<typeof detectionMethodSchema>;
