import { z } from 'zod';

// =====================================================
// ENUMS
// =====================================================

export const householdTypes = [
  'single',
  'couple',
  'family_small',
  'family_large',
  'retired',
  'student',
] as const;

// =====================================================
// ZOD SCHEMAS FOR VALIDATION
// =====================================================

export const householdTypeSchema = z.enum(householdTypes);

// Apply Template Input Validation
export const applyTemplateSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  template_id: z.string().uuid('Invalid template ID'),
  monthly_income: z
    .number()
    .positive('Monthly income must be positive')
    .finite('Monthly income must be a valid number')
    .max(10000000, 'Monthly income exceeds maximum allowed value')
    .min(1, 'Monthly income must be at least $1'),
});

// Budget Category Creation
export const createBudgetCategorySchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  category_name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name too long')
    .trim(),
  allocated_amount: z
    .number()
    .min(0, 'Allocated amount cannot be negative')
    .finite('Allocated amount must be a valid number')
    .max(10000000, 'Allocated amount exceeds maximum'),
  icon: z
    .string()
    .max(50, 'Icon name too long')
    .trim()
    .optional()
    .nullable(),
  color: z
    .string()
    .max(20, 'Color value too long')
    .trim()
    .optional()
    .nullable(),
});

// Budget Category Update
export const updateBudgetCategorySchema = z.object({
  category_name: z
    .string()
    .min(1, 'Category name cannot be empty')
    .max(100, 'Category name too long')
    .trim()
    .optional(),
  allocated_amount: z
    .number()
    .min(0, 'Allocated amount cannot be negative')
    .finite('Allocated amount must be a valid number')
    .max(10000000, 'Allocated amount exceeds maximum')
    .optional(),
  icon: z
    .string()
    .max(50, 'Icon name too long')
    .trim()
    .optional()
    .nullable(),
  color: z
    .string()
    .max(20, 'Color value too long')
    .trim()
    .optional()
    .nullable(),
});

// Monthly Income Input Validation (for template preview)
export const monthlyIncomeSchema = z
  .number()
  .positive('Income must be positive')
  .finite('Income must be a valid number')
  .max(10000000, 'Income exceeds maximum allowed value')
  .min(1, 'Income must be at least $1');

// Template Filter Schema
export const templateFilterSchema = z.object({
  household_type: householdTypeSchema.optional(),
  min_income: z.number().positive().optional(),
  max_income: z.number().positive().optional(),
});

// =====================================================
// TYPE INFERENCE FROM SCHEMAS
// =====================================================

export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
export type CreateBudgetCategoryInput = z.infer<typeof createBudgetCategorySchema>;
export type UpdateBudgetCategoryInput = z.infer<typeof updateBudgetCategorySchema>;
export type MonthlyIncome = z.infer<typeof monthlyIncomeSchema>;
export type TemplateFilter = z.infer<typeof templateFilterSchema>;
export type HouseholdType = z.infer<typeof householdTypeSchema>;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validates and sanitizes apply template input
 * @throws ZodError if validation fails
 */
export function validateApplyTemplate(data: unknown): ApplyTemplateInput {
  return applyTemplateSchema.parse(data);
}

/**
 * Validates and sanitizes budget category creation input
 * @throws ZodError if validation fails
 */
export function validateCreateBudgetCategory(data: unknown): CreateBudgetCategoryInput {
  return createBudgetCategorySchema.parse(data);
}

/**
 * Validates and sanitizes budget category update input
 * @throws ZodError if validation fails
 */
export function validateUpdateBudgetCategory(data: unknown): UpdateBudgetCategoryInput {
  return updateBudgetCategorySchema.parse(data);
}

/**
 * Validates monthly income input
 * @throws ZodError if validation fails
 */
export function validateMonthlyIncome(income: unknown): MonthlyIncome {
  return monthlyIncomeSchema.parse(income);
}

/**
 * Safe validation that returns success/error instead of throwing
 */
export function safeValidateApplyTemplate(data: unknown) {
  return applyTemplateSchema.safeParse(data);
}

/**
 * Safe validation that returns success/error instead of throwing
 */
export function safeValidateCreateBudgetCategory(data: unknown) {
  return createBudgetCategorySchema.safeParse(data);
}

/**
 * Safe validation that returns success/error instead of throwing
 */
export function safeValidateUpdateBudgetCategory(data: unknown) {
  return updateBudgetCategorySchema.safeParse(data);
}

/**
 * Safe validation that returns success/error instead of throwing
 */
export function safeValidateMonthlyIncome(income: unknown) {
  return monthlyIncomeSchema.safeParse(income);
}

/**
 * Validate template filter parameters
 * @throws ZodError if validation fails
 */
export function validateTemplateFilter(filter: unknown): TemplateFilter {
  return templateFilterSchema.parse(filter);
}
