import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES
// =====================================================

export type DependencyType = 'prerequisite' | 'trigger' | 'blocking';
export type DependencyStatus = 'pending' | 'satisfied' | 'bypassed';

export interface GoalDependency {
  id: string;
  space_id: string;
  goal_id: string;
  depends_on_goal_id: string;
  dependency_type: DependencyType;
  completion_threshold: number;
  auto_unlock: boolean;
  unlock_delay_days: number;
  status: DependencyStatus;
  satisfied_at: string | null;
  bypassed_at: string | null;
  bypassed_by: string | null;
  bypass_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface GoalWithDependencyInfo {
  id: string;
  title: string;
  progress: number;
  status: string;
  category: string | null;
  target_date: string | null;
  created_at: string;
}

export interface DependencyTreeNode {
  goal_id: string;
  goal_title: string;
  depends_on_goal_id: string;
  depends_on_title: string;
  dependency_type: DependencyType;
  completion_threshold: number;
  status: DependencyStatus;
  depth: number;
}

export interface CreateDependencyInput {
  space_id: string;
  goal_id: string;
  depends_on_goal_id: string;
  dependency_type: DependencyType;
  completion_threshold?: number;
  auto_unlock?: boolean;
  unlock_delay_days?: number;
  created_by: string;
}

export interface DependencyValidationResult {
  valid: boolean;
  error?: string;
  circular?: boolean;
}

export interface GoalDependencyStats {
  total_dependencies: number;
  satisfied_dependencies: number;
  pending_dependencies: number;
  blocked_goals: number;
  unlockable_goals: number;
}

// =====================================================
// DEPENDENCY MANAGEMENT
// =====================================================

/**
 * Create a new goal dependency
 */
export async function createDependency(input: CreateDependencyInput): Promise<GoalDependency> {
  const supabase = createClient();

  // Validate the dependency first
  const validation = await validateDependency(input);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid dependency');
  }

  const { data, error } = await supabase
    .from('goal_dependencies')
    .insert([{
      space_id: input.space_id,
      goal_id: input.goal_id,
      depends_on_goal_id: input.depends_on_goal_id,
      dependency_type: input.dependency_type,
      completion_threshold: input.completion_threshold || 100,
      auto_unlock: input.auto_unlock ?? true,
      unlock_delay_days: input.unlock_delay_days || 0,
      created_by: input.created_by,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all dependencies for a space
 */
export async function getDependencies(spaceId: string): Promise<GoalDependency[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_dependencies')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get dependencies for a specific goal
 */
export async function getGoalDependencies(goalId: string): Promise<GoalDependency[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_dependencies')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get goals that depend on a specific goal
 */
export async function getDependentGoals(goalId: string): Promise<GoalDependency[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_dependencies')
    .select('*')
    .eq('depends_on_goal_id', goalId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get dependency tree for a goal
 */
export async function getDependencyTree(goalId: string): Promise<DependencyTreeNode[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('get_goal_dependency_tree', { p_goal_id: goalId });

  if (error) throw error;
  return data || [];
}

/**
 * Update dependency
 */
export async function updateDependency(
  dependencyId: string,
  updates: Partial<Pick<GoalDependency, 'completion_threshold' | 'auto_unlock' | 'unlock_delay_days'>>
): Promise<GoalDependency> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_dependencies')
    .update(updates)
    .eq('id', dependencyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete dependency
 */
export async function deleteDependency(dependencyId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('goal_dependencies')
    .delete()
    .eq('id', dependencyId);

  if (error) throw error;
}

/**
 * Bypass a dependency (manual override)
 */
export async function bypassDependency(
  dependencyId: string,
  userId: string,
  reason: string
): Promise<GoalDependency> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_dependencies')
    .update({
      status: 'bypassed',
      bypassed_at: new Date().toISOString(),
      bypassed_by: userId,
      bypass_reason: reason,
    })
    .eq('id', dependencyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// VALIDATION & ANALYSIS
// =====================================================

/**
 * Validate a dependency before creation
 */
export async function validateDependency(input: CreateDependencyInput): Promise<DependencyValidationResult> {
  const supabase = createClient();

  // Check if both goals exist and belong to the same space
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, space_id, title')
    .in('id', [input.goal_id, input.depends_on_goal_id]);

  if (goalsError) {
    return { valid: false, error: 'Failed to validate goals' };
  }

  if (!goals || goals.length !== 2) {
    return { valid: false, error: 'One or both goals not found' };
  }

  const goal = goals.find(g => g.id === input.goal_id);
  const dependsOnGoal = goals.find(g => g.id === input.depends_on_goal_id);

  if (!goal || !dependsOnGoal) {
    return { valid: false, error: 'Goals not found' };
  }

  if (goal.space_id !== input.space_id || dependsOnGoal.space_id !== input.space_id) {
    return { valid: false, error: 'Goals must belong to the same space' };
  }

  // Check for circular dependencies
  const { data: isCircular, error: circularError } = await supabase
    .rpc('check_goal_circular_dependency', {
      p_goal_id: input.goal_id,
      p_depends_on_goal_id: input.depends_on_goal_id,
      p_space_id: input.space_id,
    });

  if (circularError) {
    return { valid: false, error: 'Failed to check for circular dependencies' };
  }

  if (isCircular) {
    return { valid: false, error: 'This would create a circular dependency', circular: true };
  }

  // Check if dependency already exists
  const { data: existing, error: existingError } = await supabase
    .from('goal_dependencies')
    .select('id')
    .eq('goal_id', input.goal_id)
    .eq('depends_on_goal_id', input.depends_on_goal_id)
    .maybeSingle();

  if (existingError) {
    return { valid: false, error: 'Failed to check existing dependencies' };
  }

  if (existing) {
    return { valid: false, error: 'Dependency already exists between these goals' };
  }

  return { valid: true };
}

/**
 * Get goals available for dependencies (excluding self and existing dependencies)
 */
export async function getAvailableGoalsForDependency(
  spaceId: string,
  goalId: string
): Promise<GoalWithDependencyInfo[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goals')
    .select('id, title, progress, status, category, target_date, created_at')
    .eq('space_id', spaceId)
    .neq('id', goalId)
    .in('status', ['active', 'completed'])
    .order('title');

  if (error) throw error;

  // Filter out goals that already have dependencies with this goal
  const existingDeps = await getGoalDependencies(goalId);
  const existingDepGoalIds = new Set(existingDeps.map(d => d.depends_on_goal_id));

  return (data || []).filter(goal => !existingDepGoalIds.has(goal.id));
}

/**
 * Get dependency statistics for a space
 */
export async function getDependencyStats(spaceId: string): Promise<GoalDependencyStats> {
  const supabase = createClient();

  const [dependencies, goals] = await Promise.all([
    getDependencies(spaceId),
    supabase.from('goals').select('id, status').eq('space_id', spaceId)
  ]);

  if (goals.error) throw goals.error;

  const total_dependencies = dependencies.length;
  const satisfied_dependencies = dependencies.filter(d => d.status === 'satisfied').length;
  const pending_dependencies = dependencies.filter(d => d.status === 'pending').length;

  // Count goals that are blocked by pending dependencies
  const blockedGoalIds = new Set(
    dependencies
      .filter(d => d.status === 'pending' && d.dependency_type === 'prerequisite')
      .map(d => d.goal_id)
  );

  // Count goals that could be unlocked (dependencies satisfied but not auto-unlocked)
  const unlockableGoalIds = new Set(
    dependencies
      .filter(d => d.status === 'satisfied' && !d.auto_unlock)
      .map(d => d.goal_id)
  );

  return {
    total_dependencies,
    satisfied_dependencies,
    pending_dependencies,
    blocked_goals: blockedGoalIds.size,
    unlockable_goals: unlockableGoalIds.size,
  };
}

/**
 * Get blocked goals (goals that cannot start due to unsatisfied prerequisites)
 */
export async function getBlockedGoals(spaceId: string): Promise<GoalWithDependencyInfo[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goals')
    .select(`
      id, title, progress, status, category, target_date, created_at,
      goal_dependencies!goal_dependencies_goal_id_fkey(
        id, dependency_type, status, depends_on_goal_id
      )
    `)
    .eq('space_id', spaceId)
    .eq('status', 'active');

  if (error) throw error;

  return (data || []).filter(goal => {
    const deps = (goal as any).goal_dependencies || [];
    return deps.some((dep: any) =>
      dep.dependency_type === 'prerequisite' && dep.status === 'pending'
    );
  });
}

/**
 * Check if a goal can be started (no blocking dependencies)
 */
export async function canGoalBeStarted(goalId: string): Promise<boolean> {
  const dependencies = await getGoalDependencies(goalId);

  return !dependencies.some(dep =>
    dep.dependency_type === 'prerequisite' && dep.status === 'pending'
  );
}

/**
 * Trigger dependent goals when a goal is completed
 */
export async function triggerDependentGoals(goalId: string): Promise<string[]> {
  const dependentGoals = await getDependentGoals(goalId);
  const triggeredGoalIds: string[] = [];

  for (const dependency of dependentGoals) {
    if (dependency.dependency_type === 'trigger' && dependency.status === 'satisfied') {
      // Logic to trigger the dependent goal (could update status, send notifications, etc.)
      triggeredGoalIds.push(dependency.goal_id);
    }
  }

  return triggeredGoalIds;
}

// Export service object
export const goalDependenciesService = {
  createDependency,
  getDependencies,
  getGoalDependencies,
  getDependentGoals,
  getDependencyTree,
  updateDependency,
  deleteDependency,
  bypassDependency,
  validateDependency,
  getAvailableGoalsForDependency,
  getDependencyStats,
  getBlockedGoals,
  canGoalBeStarted,
  triggerDependentGoals,
};