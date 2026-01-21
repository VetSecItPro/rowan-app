import { createClient } from '@/lib/supabase/client';

// ==================== TYPES ====================

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  contribution_date: string;
  description: string | null;
  payment_method: string | null;
  expense_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  user_name?: string; // Optional: populated from user join
}

export interface FinancialGoal {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  status: string;
  target_amount: number | null;
  current_amount: number | null;
  target_date: string | null;
  is_financial: boolean;
  progress: number;
  visibility: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GoalContributionStats {
  goal_id: string;
  contribution_count: number;
  contributor_count: number;
  total_contributed: number;
  avg_contribution: number;
  first_contribution_date: string | null;
  last_contribution_date: string | null;
  target_amount: number | null;
  current_amount: number | null;
  target_date: string | null;
  completion_percentage: number | null;
  amount_remaining: number;
}

export interface CreateGoalContributionInput {
  goal_id: string;
  user_id: string;
  amount: number;
  contribution_date?: string;
  description?: string;
  payment_method?: string;
  expense_id?: string;
  created_by: string;
}

export interface UpdateGoalContributionInput {
  amount?: number;
  contribution_date?: string;
  description?: string;
  payment_method?: string;
}

export interface CreateFinancialGoalInput {
  space_id: string;
  title: string;
  description?: string;
  target_amount: number;
  target_date?: string;
  visibility?: 'private' | 'shared';
  created_by: string;
}

export interface ContributorSummary {
  user_id: string;
  user_email?: string;
  total_contributed: number;
  contribution_count: number;
  last_contribution_date: string;
  percentage_of_goal: number;
}

// ==================== GOAL CONTRIBUTIONS ====================

/**
 * Gets all contributions for a goal
 */
export async function getGoalContributions(goalId: string): Promise<GoalContribution[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_contributions')
    .select('*')
    .eq('goal_id', goalId)
    .order('contribution_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Gets a single contribution by ID
 */
export async function getGoalContribution(contributionId: string): Promise<GoalContribution | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_contributions')
    .select('*')
    .eq('id', contributionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates a new goal contribution
 */
export async function createGoalContribution(
  input: CreateGoalContributionInput
): Promise<GoalContribution> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_contributions')
    .insert([
      {
        goal_id: input.goal_id,
        user_id: input.user_id,
        amount: input.amount,
        contribution_date: input.contribution_date || new Date().toISOString().split('T')[0],
        description: input.description || null,
        payment_method: input.payment_method || null,
        expense_id: input.expense_id || null,
        created_by: input.created_by,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a goal contribution
 */
export async function updateGoalContribution(
  contributionId: string,
  updates: UpdateGoalContributionInput
): Promise<GoalContribution> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_contributions')
    .update(updates)
    .eq('id', contributionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a goal contribution
 */
export async function deleteGoalContribution(contributionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('goal_contributions').delete().eq('id', contributionId);

  if (error) throw error;
}

/**
 * Gets all contributions by a specific user
 */
export async function getUserContributions(
  userId: string,
  goalId?: string
): Promise<GoalContribution[]> {
  const supabase = createClient();

  let query = supabase
    .from('goal_contributions')
    .select('*')
    .eq('user_id', userId)
    .order('contribution_date', { ascending: false });

  if (goalId) {
    query = query.eq('goal_id', goalId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ==================== FINANCIAL GOALS ====================

/**
 * Creates a new financial goal
 */
export async function createFinancialGoal(input: CreateFinancialGoalInput): Promise<FinancialGoal> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goals')
    .insert([
      {
        space_id: input.space_id,
        title: input.title,
        description: input.description || null,
        target_amount: input.target_amount,
        target_date: input.target_date || null,
        is_financial: true,
        visibility: input.visibility || 'private',
        status: 'not-started',
        progress: 0,
        current_amount: 0,
        created_by: input.created_by,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Gets all financial goals for a space
 */
export async function getFinancialGoals(spaceId: string): Promise<FinancialGoal[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_financial', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Gets a single financial goal by ID
 */
export async function getFinancialGoal(goalId: string): Promise<FinancialGoal | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('is_financial', true)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a financial goal
 */
export async function updateFinancialGoal(
  goalId: string,
  updates: Partial<FinancialGoal>
): Promise<FinancialGoal> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== STATISTICS & REPORTING ====================

/**
 * Gets contribution statistics for a goal
 */
export async function getGoalContributionStats(goalId: string): Promise<GoalContributionStats | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_contribution_stats')
    .select('*')
    .eq('goal_id', goalId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
  return data;
}

/**
 * Gets contributor breakdown for a goal
 */
export async function getGoalContributors(goalId: string): Promise<ContributorSummary[]> {
  const supabase = createClient();

  // Get goal details for percentage calculation
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('target_amount')
    .eq('id', goalId)
    .single();

  if (goalError) throw goalError;

  // Get contributions grouped by user
  const { data: contributions, error: contribError } = await supabase
    .from('goal_contributions')
    .select('user_id, amount, contribution_date, users!user_id!inner(email)')
    .eq('goal_id', goalId);

  if (contribError) throw contribError;

  // Group by user
  const contributorMap: Record<
    string,
    { total: number; count: number; lastDate: string; email?: string }
  > = {};

  for (const contrib of contributions || []) {
    if (!contributorMap[contrib.user_id]) {
      contributorMap[contrib.user_id] = {
        total: 0,
        count: 0,
        lastDate: contrib.contribution_date,
        email: (contrib as any).users?.email,
      };
    }
    contributorMap[contrib.user_id].total += parseFloat(contrib.amount.toString());
    contributorMap[contrib.user_id].count += 1;
    if (contrib.contribution_date > contributorMap[contrib.user_id].lastDate) {
      contributorMap[contrib.user_id].lastDate = contrib.contribution_date;
    }
  }

  // Convert to array
  const targetAmount = goal?.target_amount || 1;
  const contributors: ContributorSummary[] = Object.entries(contributorMap).map(
    ([userId, data]) => ({
      user_id: userId,
      user_email: data.email,
      total_contributed: Math.round(data.total * 100) / 100,
      contribution_count: data.count,
      last_contribution_date: data.lastDate,
      percentage_of_goal: Math.round((data.total / targetAmount) * 10000) / 100,
    })
  );

  // Sort by total contributed (descending)
  contributors.sort((a, b) => b.total_contributed - a.total_contributed);

  return contributors;
}

/**
 * Calculates projected completion date for a goal
 */
export async function calculateProjectedCompletionDate(goalId: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('calculate_goal_completion_date', {
    p_goal_id: goalId,
  });

  if (error) throw error;
  return data;
}

/**
 * Gets goals nearing their target
 */
export async function getGoalsNearingTarget(
  spaceId: string,
  threshold = 90
): Promise<FinancialGoal[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_financial', true)
    .gte('progress', threshold)
    .lt('progress', 100)
    .order('progress', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Gets goals behind schedule
 */
export async function getGoalsBehindSchedule(spaceId: string): Promise<FinancialGoal[]> {
  const supabase = createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_financial', true)
    .not('target_date', 'is', null)
    .lt('target_date', today)
    .lt('progress', 100)
    .order('target_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Gets recent contributions across all goals in a space
 */
export async function getRecentContributions(
  spaceId: string,
  limit = 10
): Promise<(GoalContribution & { goal_title?: string; user_email?: string })[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_contributions')
    .select('*, goals!goal_id!inner(title, space_id), users!user_id!inner(email)')
    .eq('goals.space_id', spaceId)
    .order('contribution_date', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((contrib: any) => ({
    ...contrib,
    goal_title: contrib.goals?.title,
    user_email: contrib.users?.email,
  }));
}

/**
 * Gets monthly contribution trends for a goal
 */
export async function getMonthlyContributionTrends(
  goalId: string,
  months = 6
): Promise<{ month: string; total: number; count: number }[]> {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('goal_contributions')
    .select('contribution_date, amount')
    .eq('goal_id', goalId)
    .gte('contribution_date', startDateStr)
    .order('contribution_date', { ascending: true });

  if (error) throw error;

  // Group by month
  const monthMap: Record<string, { total: number; count: number }> = {};

  for (const contrib of data || []) {
    const monthKey = contrib.contribution_date.substring(0, 7); // YYYY-MM
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { total: 0, count: 0 };
    }
    monthMap[monthKey].total += parseFloat(contrib.amount.toString());
    monthMap[monthKey].count += 1;
  }

  // Convert to array
  return Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
