import { createClient } from '@/lib/supabase/client';
import { Goal, Milestone, createGoal, updateGoal, createMilestone } from './goals-service';
import { getExpenseStatsByCategory } from './categories-tags-service';
import { getDefaultCategoriesForDomain } from '@/lib/constants/default-categories';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface BudgetGoalLink {
  id: string;
  space_id: string;
  goal_id: string;
  budget_category: string;
  link_type: 'budget_limit' | 'savings_target' | 'spending_reduction' | 'expense_tracking';
  target_amount?: number;
  current_amount?: number;
  target_percentage?: number;
  current_percentage?: number;
  time_period: 'monthly' | 'quarterly' | 'yearly';
  auto_update: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetGoalLinkInput {
  space_id: string;
  goal_id: string;
  budget_category: string;
  link_type: 'budget_limit' | 'savings_target' | 'spending_reduction' | 'expense_tracking';
  target_amount?: number;
  target_percentage?: number;
  time_period?: 'monthly' | 'quarterly' | 'yearly';
  auto_update?: boolean;
  created_by: string;
}

export interface BudgetGoalTemplate {
  title: string;
  description: string;
  category: 'financial';
  link_type: 'budget_limit' | 'savings_target' | 'spending_reduction' | 'expense_tracking';
  target_amount?: number;
  target_percentage?: number;
  milestones: {
    title: string;
    description: string;
    type: 'money' | 'percentage';
    target_value: number;
  }[];
}

export interface BudgetProgress {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage_spent: number;
  percentage_remaining: number;
  status: 'on_track' | 'warning' | 'over_budget';
  linked_goals: Goal[];
}

export interface SavingsGoalProgress {
  goal_id: string;
  target_amount: number;
  saved_amount: number;
  monthly_contribution_needed: number;
  progress_percentage: number;
  projected_completion_date: string;
  on_track: boolean;
}

// ==================== TEMPLATES ====================

export const BUDGET_GOAL_TEMPLATES: Record<string, BudgetGoalTemplate> = {
  monthly_budget_limit: {
    title: 'Stay Within Monthly Budget',
    description: 'Track spending to stay within the monthly budget limit',
    category: 'financial',
    link_type: 'budget_limit',
    target_percentage: 100,
    milestones: [
      { title: '25% Budget Check', description: 'First quarter spending check', type: 'percentage', target_value: 25 },
      { title: '50% Budget Check', description: 'Mid-month spending check', type: 'percentage', target_value: 50 },
      { title: '75% Budget Check', description: 'Three quarter spending check', type: 'percentage', target_value: 75 },
      { title: 'Monthly Budget Met', description: 'Successfully stayed within budget', type: 'percentage', target_value: 100 }
    ]
  },
  category_spending_reduction: {
    title: 'Reduce Category Spending',
    description: 'Cut spending in a specific category by a target percentage',
    category: 'financial',
    link_type: 'spending_reduction',
    target_percentage: 20,
    milestones: [
      { title: '5% Reduction', description: 'Initial spending reduction achieved', type: 'percentage', target_value: 5 },
      { title: '10% Reduction', description: 'Halfway to reduction target', type: 'percentage', target_value: 10 },
      { title: '15% Reduction', description: 'Significant progress made', type: 'percentage', target_value: 15 },
      { title: 'Target Reduction Achieved', description: 'Successfully reduced spending', type: 'percentage', target_value: 20 }
    ]
  },
  emergency_fund: {
    title: 'Build Emergency Fund',
    description: 'Save money for emergency expenses',
    category: 'financial',
    link_type: 'savings_target',
    target_amount: 5000,
    milestones: [
      { title: '$1000 Emergency Fund', description: 'First emergency fund milestone', type: 'money', target_value: 1000 },
      { title: '$2500 Halfway Point', description: 'Halfway to emergency fund goal', type: 'money', target_value: 2500 },
      { title: '$5000 Full Emergency Fund', description: 'Complete emergency fund established', type: 'money', target_value: 5000 }
    ]
  },
  vacation_savings: {
    title: 'Save for Vacation',
    description: 'Build savings for upcoming vacation expenses',
    category: 'financial',
    link_type: 'savings_target',
    target_amount: 3000,
    milestones: [
      { title: 'Vacation Planning Fund', description: 'Initial savings milestone', type: 'money', target_value: 500 },
      { title: 'Halfway to Vacation', description: 'Significant progress made', type: 'money', target_value: 1500 },
      { title: 'Vacation Fund Complete', description: 'Ready for vacation!', type: 'money', target_value: 3000 }
    ]
  }
};

// ==================== SERVICE FUNCTIONS ====================

/**
 * Create a new budget-goal link
 */
export async function createBudgetGoalLink(input: CreateBudgetGoalLinkInput): Promise<BudgetGoalLink> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('budget_goal_links')
    .insert([{
      space_id: input.space_id,
      goal_id: input.goal_id,
      budget_category: input.budget_category,
      link_type: input.link_type,
      target_amount: input.target_amount,
      target_percentage: input.target_percentage,
      time_period: input.time_period || 'monthly',
      auto_update: input.auto_update ?? true,
      created_by: input.created_by,
      current_amount: 0,
      current_percentage: 0
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all budget-goal links for a space
 */
export async function getBudgetGoalLinks(spaceId: string): Promise<BudgetGoalLink[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('budget_goal_links')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get budget-goal links for a specific goal
 */
export async function getBudgetGoalLinksForGoal(goalId: string): Promise<BudgetGoalLink[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('budget_goal_links')
    .select('*')
    .eq('goal_id', goalId);

  if (error) throw error;
  return data || [];
}

/**
 * Update budget-goal link progress
 */
export async function updateBudgetGoalLinkProgress(
  linkId: string,
  currentAmount?: number,
  currentPercentage?: number
): Promise<BudgetGoalLink> {
  const supabase = createClient();

  const updateData: any = { updated_at: new Date().toISOString() };
  if (currentAmount !== undefined) updateData.current_amount = currentAmount;
  if (currentPercentage !== undefined) updateData.current_percentage = currentPercentage;

  const { data, error } = await supabase
    .from('budget_goal_links')
    .update(updateData)
    .eq('id', linkId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a financial goal from a budget template
 */
export async function createGoalFromBudgetTemplate(
  spaceId: string,
  templateKey: keyof typeof BUDGET_GOAL_TEMPLATES,
  budgetCategory: string,
  customAmount?: number,
  userId?: string
): Promise<{ goal: Goal; link: BudgetGoalLink }> {
  const template = BUDGET_GOAL_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Template ${templateKey} not found`);
  }

  // Create the goal
  const goalData = {
    space_id: spaceId,
    title: template.title.replace('Category', budgetCategory),
    description: template.description,
    category: template.category,
    status: 'active' as const,
    progress: 0,
    visibility: 'shared' as const,
    priority: 'p2' as const,
    created_by: userId || 'system'
  };

  const goal = await createGoal(goalData);

  // Create milestones (created as not completed by default)
  for (const milestoneTemplate of template.milestones) {
    await createMilestone({
      goal_id: goal.id,
      title: milestoneTemplate.title,
      description: milestoneTemplate.description,
      type: milestoneTemplate.type,
      target_value: customAmount
        ? (milestoneTemplate.target_value / (template.target_amount || 100)) * customAmount
        : milestoneTemplate.target_value,
      current_value: 0,
    });
  }

  // Create the budget-goal link
  const link = await createBudgetGoalLink({
    space_id: spaceId,
    goal_id: goal.id,
    budget_category: budgetCategory,
    link_type: template.link_type,
    target_amount: customAmount || template.target_amount,
    target_percentage: template.target_percentage,
    time_period: 'monthly',
    auto_update: true,
    created_by: userId || 'system'
  });

  return { goal, link };
}

/**
 * Get budget progress with linked goals
 */
export async function getBudgetProgressWithGoals(spaceId: string): Promise<BudgetProgress[]> {
  const supabase = createClient();

  // Get expense categories with default budgets
  const expenseCategories = getDefaultCategoriesForDomain('expense');
  const startDate = new Date();
  startDate.setDate(1); // First day of current month
  const endDate = new Date();

  // Get actual spending data
  const expenseStats = await getExpenseStatsByCategory(
    spaceId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  // Get budget-goal links
  const budgetLinks = await getBudgetGoalLinks(spaceId);

  // Get linked goals
  const linkedGoalIds = budgetLinks.map(link => link.goal_id);
  const { data: linkedGoals, error } = await supabase
    .from('goals')
    .select('*')
    .in('id', linkedGoalIds);

  if (error) throw error;

  const progress: BudgetProgress[] = [];

  for (const category of expenseCategories) {
    const spent = expenseStats.find(stat => stat.category === category.name)?.total || 0;
    const budgeted = category.monthly_budget || 0;
    const remaining = Math.max(0, budgeted - spent);
    const percentageSpent = budgeted > 0 ? (spent / budgeted) * 100 : 0;
    const percentageRemaining = Math.max(0, 100 - percentageSpent);

    let status: 'on_track' | 'warning' | 'over_budget' = 'on_track';
    if (percentageSpent > 100) status = 'over_budget';
    else if (percentageSpent > 80) status = 'warning';

    const categoryLinkedGoals = budgetLinks
      .filter((link: { budget_category: string }) => link.budget_category === category.name)
      .map((link: { goal_id: string }) => linkedGoals?.find((goal: Goal) => goal.id === link.goal_id))
      .filter(Boolean) as Goal[];

    progress.push({
      category: category.name,
      budgeted,
      spent,
      remaining,
      percentage_spent: percentageSpent,
      percentage_remaining: percentageRemaining,
      status,
      linked_goals: categoryLinkedGoals
    });
  }

  return progress;
}

/**
 * Calculate savings goal progress
 */
export async function calculateSavingsGoalProgress(
  spaceId: string,
  goalId: string
): Promise<SavingsGoalProgress | null> {
  const supabase = createClient();

  // Get goal details
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (goalError || !goal) return null;

  // Get budget-goal link
  const links = await getBudgetGoalLinksForGoal(goalId);
  const savingsLink = links.find(link => link.link_type === 'savings_target');

  if (!savingsLink) return null;

  const targetAmount = savingsLink.target_amount || 0;
  const savedAmount = savingsLink.current_amount || 0;
  const progressPercentage = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0;

  // Calculate monthly contribution needed
  const targetDate = goal.target_date ? new Date(goal.target_date) : null;
  const today = new Date();
  const monthsRemaining = targetDate
    ? Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 12;

  const remainingAmount = Math.max(0, targetAmount - savedAmount);
  const monthlyContributionNeeded = remainingAmount / monthsRemaining;

  // Project completion date
  const projectedCompletionDate = new Date();
  projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + monthsRemaining);

  // Check if on track
  const expectedProgress = targetDate
    ? ((today.getTime() - new Date(goal.created_at).getTime()) / (targetDate.getTime() - new Date(goal.created_at).getTime())) * 100
    : progressPercentage;
  const onTrack = progressPercentage >= expectedProgress * 0.9; // 90% of expected progress

  return {
    goal_id: goalId,
    target_amount: targetAmount,
    saved_amount: savedAmount,
    monthly_contribution_needed: monthlyContributionNeeded,
    progress_percentage: progressPercentage,
    projected_completion_date: projectedCompletionDate.toISOString().split('T')[0],
    on_track: onTrack
  };
}

/**
 * Auto-update all budget-goal links progress
 */
export async function autoUpdateBudgetGoalProgress(spaceId: string): Promise<void> {
  const links = await getBudgetGoalLinks(spaceId);
  const autoUpdateLinks = links.filter(link => link.auto_update);

  for (const link of autoUpdateLinks) {
    try {
      // Get current spending for the category
      const startDate = new Date();
      startDate.setDate(1); // First day of current month
      const endDate = new Date();

      const expenseStats = await getExpenseStatsByCategory(
        spaceId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const categoryStats = expenseStats.find(stat => stat.category === link.budget_category);
      const currentSpent = categoryStats?.total || 0;

      let newAmount = currentSpent;
      let newPercentage = 0;

      if (link.link_type === 'budget_limit' && link.target_amount) {
        newPercentage = (currentSpent / link.target_amount) * 100;
      } else if (link.link_type === 'savings_target') {
        // For savings, we need to track accumulated savings
        newAmount = link.current_amount || 0; // This would need to be updated manually or from bank integration
      } else if (link.link_type === 'spending_reduction' && link.target_percentage) {
        // Calculate reduction percentage vs previous period
        const prevStartDate = new Date(startDate);
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(0); // Last day of previous month

        const prevExpenseStats = await getExpenseStatsByCategory(
          spaceId,
          prevStartDate.toISOString().split('T')[0],
          prevEndDate.toISOString().split('T')[0]
        );

        const prevCategoryStats = prevExpenseStats.find(stat => stat.category === link.budget_category);
        const prevSpent = prevCategoryStats?.total || 0;

        if (prevSpent > 0) {
          const reductionPercentage = ((prevSpent - currentSpent) / prevSpent) * 100;
          newPercentage = Math.max(0, reductionPercentage);
        }
      }

      // Update the link
      await updateBudgetGoalLinkProgress(link.id, newAmount, newPercentage);

      // Update goal progress
      const progressPercentage = link.target_percentage
        ? Math.min(100, (newPercentage / link.target_percentage) * 100)
        : link.target_amount
        ? Math.min(100, (newAmount / link.target_amount) * 100)
        : 0;

      await updateGoal(link.goal_id, {
        progress: Math.round(progressPercentage)
      });

    } catch (error) {
      logger.error('Failed to update budget-goal link ${link.id}:', error, { component: 'lib-budget-goals-linking-service', action: 'service_call' });
    }
  }
}

/**
 * Delete a budget-goal link
 */
export async function deleteBudgetGoalLink(linkId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('budget_goal_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
}