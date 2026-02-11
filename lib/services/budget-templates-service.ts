import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES
// =====================================================

export type HouseholdType = 'single' | 'couple' | 'family_small' | 'family_large' | 'retired' | 'student';

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string | null;
  household_type: HouseholdType;
  icon: string;
  recommended_income_min: number | null;
  recommended_income_max: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetTemplateCategory {
  id: string;
  template_id: string;
  category_name: string;
  percentage: number;
  icon: string | null;
  color: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  space_id: string;
  category_name: string;
  allocated_amount: number;
  spent_amount: number;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplyTemplateInput {
  space_id: string;
  template_id: string;
  monthly_income: number;
}

export interface BudgetCategoryWithProgress extends BudgetCategory {
  percentage_spent: number;
  remaining_amount: number;
}

// =====================================================
// BUDGET TEMPLATES OPERATIONS
// =====================================================

/**
 * Get all active budget templates
 */
export async function getBudgetTemplates(): Promise<BudgetTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('budget_templates')
    .select('id, name, description, household_type, icon, recommended_income_min, recommended_income_max, is_active, sort_order, created_at, updated_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get templates by household type
 */
export async function getTemplatesByHouseholdType(
  householdType: HouseholdType
): Promise<BudgetTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('budget_templates')
    .select('id, name, description, household_type, icon, recommended_income_min, recommended_income_max, is_active, sort_order, created_at, updated_at')
    .eq('household_type', householdType)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(
  templateId: string
): Promise<BudgetTemplate | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('budget_templates')
    .select('id, name, description, household_type, icon, recommended_income_min, recommended_income_max, is_active, sort_order, created_at, updated_at')
    .eq('id', templateId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get template categories for a template
 */
export async function getTemplateCategories(
  templateId: string
): Promise<BudgetTemplateCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('budget_template_categories')
    .select('id, template_id, category_name, percentage, icon, color, description, sort_order, created_at')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get template with its categories
 */
export async function getTemplateWithCategories(templateId: string): Promise<{
  template: BudgetTemplate;
  categories: BudgetTemplateCategory[];
}> {
  const [template, categories] = await Promise.all([
    getTemplateById(templateId),
    getTemplateCategories(templateId),
  ]);

  if (!template) throw new Error('Template not found');

  return { template, categories };
}

/**
 * Preview template allocation based on income
 */
export function previewTemplateAllocation(
  categories: BudgetTemplateCategory[],
  monthlyIncome: number
): Array<BudgetTemplateCategory & { calculated_amount: number }> {
  return categories.map((category) => ({
    ...category,
    calculated_amount: Math.round((monthlyIncome * category.percentage) / 100 * 100) / 100,
  }));
}

/**
 * Apply template to a space
 * This calls the database function that creates/updates budget categories
 */
export async function applyTemplate(input: ApplyTemplateInput): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('apply_budget_template', {
    p_space_id: input.space_id,
    p_template_id: input.template_id,
    p_monthly_income: input.monthly_income,
  });

  if (error) throw error;
}

// =====================================================
// BUDGET CATEGORIES OPERATIONS
// =====================================================

/**
 * Get budget categories for a space
 */
export async function getBudgetCategories(
  spaceId: string
): Promise<BudgetCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('budget_categories')
    .select('id, space_id, category_name, allocated_amount, spent_amount, icon, color, created_at, updated_at')
    .eq('space_id', spaceId)
    .order('category_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get budget categories with spending progress
 */
export async function getBudgetCategoriesWithProgress(
  spaceId: string
): Promise<BudgetCategoryWithProgress[]> {
  const categories = await getBudgetCategories(spaceId);

  return categories.map((category) => ({
    ...category,
    percentage_spent:
      category.allocated_amount > 0
        ? (category.spent_amount / category.allocated_amount) * 100
        : 0,
    remaining_amount: category.allocated_amount - category.spent_amount,
  }));
}

/**
 * Create a budget category
 */
export async function createBudgetCategory(
  category: Omit<BudgetCategory, 'id' | 'created_at' | 'updated_at' | 'spent_amount'>
): Promise<BudgetCategory> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('budget_categories')
    .insert([category])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a budget category
 */
export async function updateBudgetCategory(
  categoryId: string,
  updates: Partial<Pick<BudgetCategory, 'category_name' | 'allocated_amount' | 'icon' | 'color'>>
): Promise<BudgetCategory> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('budget_categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a budget category
 */
export async function deleteBudgetCategory(categoryId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}

/**
 * Update spent amount for a category
 * This would typically be called when expenses are categorized
 */
export async function updateCategorySpentAmount(
  spaceId: string,
  categoryName: string,
  spentAmount: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('budget_categories')
    .update({ spent_amount: spentAmount })
    .eq('space_id', spaceId)
    .eq('category_name', categoryName);

  if (error) throw error;
}

/**
 * Get category budget stats
 */
export async function getCategoryBudgetStats(spaceId: string): Promise<{
  total_allocated: number;
  total_spent: number;
  total_remaining: number;
  categories_count: number;
  categories_over_budget: number;
}> {
  const categories = await getBudgetCategoriesWithProgress(spaceId);

  const total_allocated = categories.reduce(
    (sum, cat) => sum + cat.allocated_amount,
    0
  );
  const total_spent = categories.reduce((sum, cat) => sum + cat.spent_amount, 0);
  const total_remaining = total_allocated - total_spent;
  const categories_over_budget = categories.filter(
    (cat) => cat.spent_amount > cat.allocated_amount
  ).length;

  return {
    total_allocated,
    total_spent,
    total_remaining,
    categories_count: categories.length,
    categories_over_budget,
  };
}

// Export service object
export const budgetTemplatesService = {
  // Templates
  getBudgetTemplates,
  getTemplatesByHouseholdType,
  getTemplateById,
  getTemplateCategories,
  getTemplateWithCategories,
  previewTemplateAllocation,
  applyTemplate,

  // Categories
  getBudgetCategories,
  getBudgetCategoriesWithProgress,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  updateCategorySpentAmount,
  getCategoryBudgetStats,
};
