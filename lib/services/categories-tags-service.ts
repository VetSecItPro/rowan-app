import { createClient } from '@/lib/supabase/client';
import type { Task, Expense } from '@/lib/types';
import type { Goal } from '@/lib/services/goals-service';

// ==================== TYPES ====================

export interface CustomCategory {
  id: string;
  space_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  parent_category_id: string | null;
  monthly_budget: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  space_id: string;
  name: string;
  color: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Helper interfaces for nested query results
interface TagRelation {
  tags: Tag;
}

interface ExpenseRelation {
  expenses: Expense;
}

interface GoalRelation {
  goals: Goal;
}

interface TaskRelation {
  tasks: Task;
}

export interface CreateCustomCategoryInput {
  space_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  monthly_budget?: number;
  created_by: string;
}

export interface UpdateCustomCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  monthly_budget?: number;
  is_active?: boolean;
}

export interface CreateTagInput {
  space_id: string;
  name: string;
  color?: string;
  description?: string;
  created_by: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string;
}

// ==================== CUSTOM CATEGORIES ====================

/**
 * Gets all custom categories for a space
 */
export async function getCustomCategories(
  spaceId: string,
  includeInactive = false
): Promise<CustomCategory[]> {
  const supabase = createClient();

  let query = supabase
    .from('custom_categories')
    .select('*')
    .eq('space_id', spaceId)
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Gets a single custom category by ID
 */
export async function getCustomCategory(categoryId: string): Promise<CustomCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates a new custom category
 */
export async function createCustomCategory(input: CreateCustomCategoryInput): Promise<CustomCategory> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('custom_categories')
    .insert([
      {
        space_id: input.space_id,
        name: input.name,
        description: input.description || null,
        icon: input.icon || null,
        color: input.color || '#6366f1',
        parent_category_id: input.parent_category_id || null,
        monthly_budget: input.monthly_budget || null,
        created_by: input.created_by,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a custom category
 */
export async function updateCustomCategory(
  categoryId: string,
  updates: UpdateCustomCategoryInput
): Promise<CustomCategory> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('custom_categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a custom category
 */
export async function deleteCustomCategory(categoryId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('custom_categories').delete().eq('id', categoryId);

  if (error) throw error;
}

/**
 * Gets subcategories for a parent category
 */
export async function getSubcategories(parentCategoryId: string): Promise<CustomCategory[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('parent_category_id', parentCategoryId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Gets category hierarchy (parent categories with their subcategories)
 */
export async function getCategoryHierarchy(spaceId: string): Promise<CustomCategory[]> {
  const supabase = createClient();

  // Get all active categories
  const { data: categories, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;

  // Build hierarchy (parent categories only at top level)
  return (categories || []).filter((cat: { parent_category_id: string | null }) => !cat.parent_category_id);
}

// ==================== TAGS ====================

/**
 * Gets all tags for a space
 */
export async function getTags(spaceId: string): Promise<Tag[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('space_id', spaceId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Gets a single tag by ID
 */
export async function getTag(tagId: string): Promise<Tag | null> {
  const supabase = createClient();

  const { data, error } = await supabase.from('tags').select('*').eq('id', tagId).single();

  if (error) throw error;
  return data;
}

/**
 * Creates a new tag
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tags')
    .insert([
      {
        space_id: input.space_id,
        name: input.name,
        color: input.color || '#8b5cf6',
        description: input.description || null,
        created_by: input.created_by,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a tag
 */
export async function updateTag(tagId: string, updates: UpdateTagInput): Promise<Tag> {
  const supabase = createClient();

  const { data, error } = await supabase.from('tags').update(updates).eq('id', tagId).select().single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a tag
 */
export async function deleteTag(tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('tags').delete().eq('id', tagId);

  if (error) throw error;
}

// ==================== EXPENSE TAGS ====================

/**
 * Gets all tags for an expense
 */
export async function getExpenseTags(expenseId: string): Promise<Tag[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('expense_tags')
    .select('tag_id, tags(*)')
    .eq('expense_id', expenseId);

  if (error) throw error;
  return (data || []).map((item: TagRelation) => item.tags);
}

/**
 * Adds a tag to an expense
 */
export async function addTagToExpense(expenseId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('expense_tags')
    .insert([{ expense_id: expenseId, tag_id: tagId }]);

  if (error && error.code !== '23505') {
    // Ignore unique constraint violations (tag already added)
    throw error;
  }
}

/**
 * Removes a tag from an expense
 */
export async function removeTagFromExpense(expenseId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('expense_tags')
    .delete()
    .eq('expense_id', expenseId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * Gets all expenses with a specific tag
 */
export async function getExpensesByTag(tagId: string): Promise<Expense[]> {
  const supabase = createClient();

  const { data, error} = await supabase
    .from('expense_tags')
    .select('expense_id, expenses(*)')
    .eq('tag_id', tagId);

  if (error) throw error;
  return (data || []).map((item: ExpenseRelation) => item.expenses);
}

// ==================== GOAL TAGS ====================

/**
 * Gets all tags for a goal
 */
export async function getGoalTags(goalId: string): Promise<Tag[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_tags')
    .select('tag_id, tags(*)')
    .eq('goal_id', goalId);

  if (error) throw error;
  return (data || []).map((item: TagRelation) => item.tags);
}

/**
 * Adds a tag to a goal
 */
export async function addTagToGoal(goalId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('goal_tags').insert([{ goal_id: goalId, tag_id: tagId }]);

  if (error && error.code !== '23505') {
    throw error;
  }
}

/**
 * Removes a tag from a goal
 */
export async function removeTagFromGoal(goalId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('goal_tags').delete().eq('goal_id', goalId).eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * Gets all goals with a specific tag
 */
export async function getGoalsByTag(tagId: string): Promise<Goal[]> {
  const supabase = createClient();

  const { data, error } = await supabase.from('goal_tags').select('goal_id, goals(*)').eq('tag_id', tagId);

  if (error) throw error;
  return (data || []).map((item: GoalRelation) => item.goals);
}

// ==================== TASK TAGS ====================

/**
 * Gets all tags for a task
 */
export async function getTaskTags(taskId: string): Promise<Tag[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('task_tags')
    .select('tag_id, tags(*)')
    .eq('task_id', taskId);

  if (error) throw error;
  return (data || []).map((item: TagRelation) => item.tags);
}

/**
 * Adds a tag to a task
 */
export async function addTagToTask(taskId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('task_tags').insert([{ task_id: taskId, tag_id: tagId }]);

  if (error && error.code !== '23505') {
    throw error;
  }
}

/**
 * Removes a tag from a task
 */
export async function removeTagFromTask(taskId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('task_tags').delete().eq('task_id', taskId).eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * Gets all tasks with a specific tag
 */
export async function getTasksByTag(tagId: string): Promise<Task[]> {
  const supabase = createClient();

  const { data, error } = await supabase.from('task_tags').select('task_id, tasks(*)').eq('tag_id', tagId);

  if (error) throw error;
  return (data || []).map((item: TaskRelation) => item.tasks);
}

// ==================== REPORTING & FILTERING ====================

/**
 * Gets expense statistics by custom category
 */
export async function getExpenseStatsByCategory(
  spaceId: string,
  startDate?: string,
  endDate?: string
): Promise<{ category: string; total: number; count: number }[]> {
  const supabase = createClient();

  let query = supabase.from('expenses').select('category, amount').eq('space_id', spaceId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error } = await query;

  if (error) throw error;

  // Group by category
  const stats = (data || []).reduce((acc: Record<string, { category: string; total: number; count: number }>, expense: Expense) => {
    const cat = expense.category || 'Uncategorized';
    if (!acc[cat]) {
      acc[cat] = { category: cat, total: 0, count: 0 };
    }
    acc[cat].total += parseFloat(String(expense.amount));
    acc[cat].count += 1;
    return acc;
  }, {});

  return Object.values(stats);
}

/**
 * Gets expense statistics by tag
 */
export async function getExpenseStatsByTag(
  spaceId: string,
  startDate?: string,
  endDate?: string
): Promise<{ tag: Tag; total: number; count: number }[]> {
  // PERF: Single query with join instead of N+1 — FIX-017
  const supabase = createClient();
  const tags = await getTags(spaceId);
  if (tags.length === 0) return [];

  const tagIds = tags.map(t => t.id);

  // Fetch all expense-tag associations for these tags in one query
  const { data: expenseTags, error } = await supabase
    .from('expense_tags')
    .select('tag_id, expenses!inner(id, amount, date)')
    .in('tag_id', tagIds);

  if (error || !expenseTags) return [];

  // Group by tag and aggregate
  const tagMap = new Map(tags.map(t => [t.id, t]));
  const statsMap = new Map<string, { total: number; count: number }>();

  for (const et of expenseTags) {
    const expense = et.expenses as unknown as { id: string; amount: number | string; date: string | null };
    if (!expense) continue;

    // Filter by date if provided
    if (startDate && expense.date && expense.date < startDate) continue;
    if (endDate && expense.date && expense.date > endDate) continue;

    const existing = statsMap.get(et.tag_id) || { total: 0, count: 0 };
    existing.total += parseFloat(String(expense.amount));
    existing.count += 1;
    statsMap.set(et.tag_id, existing);
  }

  const results = [];
  for (const [tagId, stats] of statsMap) {
    const tag = tagMap.get(tagId);
    if (tag && stats.count > 0) {
      results.push({ tag, total: stats.total, count: stats.count });
    }
  }

  return results;
}

/**
 * Searches for items by tag names
 */
export async function searchByTags(
  spaceId: string,
  tagNames: string[]
): Promise<{
  expenses: Expense[];
  goals: Goal[];
  tasks: Task[];
}> {
  const supabase = createClient();

  // Get tag IDs for the tag names
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('id')
    .eq('space_id', spaceId)
    .in('name', tagNames);

  if (tagsError) throw tagsError;

  const tagIds = (tags || []).map((t: { id: string }) => t.id);

  if (tagIds.length === 0) {
    return { expenses: [], goals: [], tasks: [] };
  }

  // Get all items with these tags
  const [expenses, goals, tasks] = await Promise.all([
    Promise.all(tagIds.map((id: string) => getExpensesByTag(id))).then((results) => results.flat()),
    Promise.all(tagIds.map((id: string) => getGoalsByTag(id))).then((results) => results.flat()),
    Promise.all(tagIds.map((id: string) => getTasksByTag(id))).then((results) => results.flat()),
  ]);

  return {
    expenses,
    goals,
    tasks,
  };
}
