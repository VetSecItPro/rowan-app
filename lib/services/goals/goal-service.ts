/**
 * Goal Service — Core CRUD, collaboration, templates, priority, and ordering.
 *
 * @module goals/goal-service
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkAndAwardBadges } from '../achievement-service';
import { enhancedNotificationService } from '../enhanced-notification-service';
import { logger } from '@/lib/logger';
import { cacheAside, cacheKeys, deleteCachePattern, CACHE_TTL, CACHE_PREFIXES } from '@/lib/cache';
import { getAppUrl } from '@/lib/utils/app-url';
import type {
  Goal,
  CreateGoalInput,
  GoalUpdatePayload,
  GoalCollaborator,
  AddCollaboratorInput,
  GoalTemplate,
  GoalStats,
  Milestone,
} from './types';

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

/** Core goal service for CRUD, collaboration, templates, priority, ordering, and stats. */
export const goalService = {
  /**
   * Retrieves all goals for a space with milestones and assignee data.
   * @param spaceId - The space ID to fetch goals from
   * @param supabaseClient - Optional Supabase client instance
   * @returns Array of goals sorted by pinned status and priority order
   * @throws Error if the database query fails
   */
  async getGoals(spaceId: string, supabaseClient?: SupabaseClient): Promise<Goal[]> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('goals')
      .select(`
        id, space_id, title, description, category, status, progress, visibility, template_id, priority, priority_order, is_pinned, target_date, assigned_to, created_by, created_at, updated_at, completed_at,
        milestones:goal_milestones(*),
        assignee:assigned_to (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('space_id', spaceId)
      .order('is_pinned', { ascending: false })
      .order('priority_order', { ascending: true })
      .limit(500);

    if (error) throw error;

    // Map the data to handle null assignee
    const mappedData = (data || []).map((goal: Goal) => ({
      ...goal,
      assignee: goal.assignee || undefined,
    }));

    return mappedData;
  },

  /**
   * Retrieves a single goal by ID with milestones and assignee data.
   * @param id - The goal ID
   * @param supabaseClient - Optional Supabase client instance
   * @returns The goal or null if not found
   * @throws Error if the database query fails
   */
  async getGoalById(id: string, supabaseClient?: SupabaseClient): Promise<Goal | null> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('goals')
      .select(`
        id, space_id, title, description, category, status, progress, visibility, template_id, priority, priority_order, is_pinned, target_date, assigned_to, created_by, created_at, updated_at, completed_at,
        milestones:goal_milestones(*),
        assignee:assigned_to (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Map the data to handle null assignee
    if (data) {
      return {
        ...data,
        assignee: data.assignee || undefined,
      };
    }

    return data;
  },

  /**
   * Creates a new goal in a space.
   * Invalidates goal stats cache on success.
   * @param input - Goal creation data including space_id and title
   * @param supabaseClient - Optional Supabase client instance
   * @returns The newly created goal
   * @throws Error if the database insert fails
   */
  async createGoal(input: CreateGoalInput, supabaseClient?: SupabaseClient): Promise<Goal> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('goals')
      .insert([{
        ...input,
        status: input.status || 'active',
        progress: input.progress || 0,
      }])
      .select()
      .single();

    if (error) throw error;

    // Invalidate goal stats cache (fire-and-forget)
    if (input.space_id) {
      deleteCachePattern(`${CACHE_PREFIXES.GOAL_STATS}${input.space_id}*`).catch(() => {});
    }

    return data;
  },

  /**
   * Updates a goal with the provided changes.
   * Automatically sets completed_at and progress when status changes to 'completed'.
   * Triggers badge checks and notifications on completion.
   * @param id - The goal ID to update
   * @param updates - Partial goal data to apply
   * @param supabaseClient - Optional Supabase client instance
   * @returns The updated goal
   * @throws Error if the database update fails
   */
  async updateGoal(id: string, updates: Partial<CreateGoalInput>, supabaseClient?: SupabaseClient): Promise<Goal> {
    const supabase = getSupabaseClient(supabaseClient);
    const finalUpdates: GoalUpdatePayload = { ...updates };

    // Check if goal is being completed
    const isBeingCompleted = updates.status === 'completed' && !finalUpdates.completed_at;

    if (isBeingCompleted) {
      finalUpdates.completed_at = new Date().toISOString();
      finalUpdates.progress = 100;
    }

    if (updates.status && updates.status !== 'completed') {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('goals')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Check for badge awards and send notifications when goal is completed
    if (isBeingCompleted && data.space_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Trigger badge checking in the background (don't await to avoid blocking)
          checkAndAwardBadges(user.id, data.space_id).catch((error) => logger.error('Caught error', error, { component: 'lib-goals-service', action: 'service_call' }));

          // Get user name, space info, and space members in parallel
          const [{ data: userData }, { data: spaceData }, spaceMembers] = await Promise.all([
            supabase.from('users').select('name').eq('id', user.id).single(),
            supabase.from('spaces').select('name').eq('id', data.space_id).single(),
            enhancedNotificationService.getSpaceMembers(data.space_id),
          ]);

          // Send goal completion notifications
          if (spaceMembers.length > 0) {
            enhancedNotificationService.sendGoalAchievementNotification(
              spaceMembers.map(member => member.user_id),
              {
                goalTitle: data.title,
                goalId: data.id,
                goalUrl: `${getAppUrl()}/goals/${data.id}?space_id=${data.space_id}`,
                achievementType: 'goal_completed',
                completedBy: userData?.name || 'Someone',
                completionDate: finalUpdates.completed_at || new Date().toISOString(),
                spaceName: spaceData?.name || 'Your Space',
              }
            ).catch((error) => logger.error('Caught error', error, { component: 'lib-goals-service', action: 'service_call' }));
          }
        }
      } catch (error) {
        logger.error('Failed to check for achievement badges or send notifications:', error, { component: 'lib-goals-service', action: 'service_call' });
      }
    }

    // Invalidate goal stats cache (fire-and-forget)
    if (data.space_id) {
      deleteCachePattern(`${CACHE_PREFIXES.GOAL_STATS}${data.space_id}*`).catch(() => {});
    }

    return data;
  },

  /**
   * Permanently deletes a goal and its associated data.
   * @param id - The goal ID to delete
   * @param supabaseClient - Optional Supabase client instance
   * @throws Error if the database delete fails
   */
  async deleteGoal(id: string, supabaseClient?: SupabaseClient): Promise<void> {
    const supabase = getSupabaseClient(supabaseClient);
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Collaboration methods

  /**
   * Retrieves all collaborators for a goal.
   * @param goalId - The goal ID
   * @returns Array of collaborators sorted by creation date descending
   * @throws Error if the database query fails
   */
  async getGoalCollaborators(goalId: string): Promise<GoalCollaborator[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_collaborators')
      .select('id, goal_id, user_id, role, invited_by, invited_at, created_at, updated_at')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Adds a collaborator to a goal.
   * @param input - Collaborator data including goal_id, user_id, and role
   * @returns The created collaborator record
   * @throws Error if user is not authenticated or database insert fails
   */
  async addCollaborator(input: AddCollaboratorInput): Promise<GoalCollaborator> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_collaborators')
      .insert([{
        ...input,
        invited_by: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates a collaborator's role on a goal.
   * @param collaboratorId - The collaborator record ID
   * @param role - The new role ('contributor' or 'viewer')
   * @returns The updated collaborator record
   * @throws Error if the database update fails
   */
  async updateCollaboratorRole(collaboratorId: string, role: 'contributor' | 'viewer'): Promise<GoalCollaborator> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_collaborators')
      .update({ role })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Removes a collaborator from a goal.
   * @param collaboratorId - The collaborator record ID to remove
   * @throws Error if the database delete fails
   */
  async removeCollaborator(collaboratorId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goal_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) throw error;
  },

  /**
   * Toggles a goal's visibility between private and shared.
   * @param goalId - The goal ID
   * @param visibility - The new visibility setting
   * @returns The updated goal
   * @throws Error if the database update fails
   */
  async toggleGoalVisibility(goalId: string, visibility: 'private' | 'shared'): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .update({ visibility })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Template methods

  /**
   * Retrieves goal templates, optionally filtered by category.
   * @param category - Optional category filter
   * @returns Array of templates sorted by usage count descending
   * @throws Error if the database query fails
   */
  async getGoalTemplates(category?: string): Promise<GoalTemplate[]> {
    const supabase = createClient();
    let query = supabase
      .from('goal_templates')
      .select('id, title, description, category, icon, target_days, is_public, created_by, usage_count, created_at, updated_at, milestones:milestone_templates(*)')
      .order('usage_count', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Retrieves a goal template by ID with its milestone templates.
   * @param id - The template ID
   * @returns The template or null if not found
   * @throws Error if the database query fails
   */
  async getGoalTemplateById(id: string): Promise<GoalTemplate | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_templates')
      .select('id, title, description, category, icon, target_days, is_public, created_by, usage_count, created_at, updated_at, milestones:milestone_templates(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates a goal from a template with optional customizations.
   * Automatically creates milestones from the template's milestone templates.
   * @param spaceId - The space ID to create the goal in
   * @param templateId - The template ID to use
   * @param customizations - Optional overrides for title, description, target_date, visibility
   * @returns The created goal with milestones
   * @throws Error if template not found or database operations fail
   */
  async createGoalFromTemplate(
    spaceId: string,
    templateId: string,
    customizations?: {
      title?: string;
      description?: string;
      target_date?: string;
      visibility?: 'private' | 'shared';
    }
  ): Promise<Goal> {
    // Get template with milestone templates
    const template = await this.getGoalTemplateById(templateId);
    if (!template) throw new Error('Template not found');

    // Calculate target date if not provided
    const targetDate = customizations?.target_date ||
      (template.target_days
        ? new Date(Date.now() + template.target_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : undefined);

    // Create goal from template
    const goal = await this.createGoal({
      space_id: spaceId,
      title: customizations?.title || template.title,
      description: customizations?.description || template.description,
      category: template.category,
      template_id: templateId,
      target_date: targetDate,
      visibility: customizations?.visibility,
      status: 'active',
      progress: 0,
    });

    // PERF: Batch insert milestones instead of sequential creates — FIX-041
    if (template.milestones && template.milestones.length > 0) {
      const supabase = createClient();
      const milestoneRows = template.milestones.map((milestoneTemplate) => ({
        goal_id: goal.id,
        title: milestoneTemplate.title,
        description: milestoneTemplate.description,
        type: milestoneTemplate.type,
        target_value: milestoneTemplate.target_value,
        completed: false,
      }));

      const { error: milestoneError } = await supabase
        .from('goal_milestones')
        .insert(milestoneRows);

      if (milestoneError) throw milestoneError;
    }

    // Fetch complete goal with milestones
    return await this.getGoalById(goal.id) || goal;
  },

  /**
   * Retrieves all template categories with counts and icons.
   * @returns Array of category objects with name, count, and icon
   * @throws Error if the database query fails
   */
  async getTemplateCategories(): Promise<Array<{ category: string; count: number; icon: string }>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_templates')
      .select('category, icon')
      .eq('is_public', true);

    if (error) throw error;

    // Group by category and count
    const categoryMap = new Map<string, { count: number; icon: string }>();
    data?.forEach((template: { category: string; icon?: string | null }) => {
      const current = categoryMap.get(template.category) || { count: 0, icon: template.icon || '' };
      categoryMap.set(template.category, {
        count: current.count + 1,
        icon: template.icon || current.icon
      });
    });

    return Array.from(categoryMap.entries()).map(([category, { count, icon }]) => ({
      category,
      count,
      icon
    }));
  },

  // Priority and ordering methods

  /**
   * Updates a goal's priority level.
   * @param goalId - The goal ID
   * @param priority - The new priority ('none', 'p1', 'p2', 'p3', 'p4')
   * @returns The updated goal
   * @throws Error if the database update fails
   */
  async updateGoalPriority(goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4'): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .update({ priority })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Toggles a goal's pinned status.
   * Pinned goals appear at the top of the list.
   * @param goalId - The goal ID
   * @param isPinned - Whether the goal should be pinned
   * @returns The updated goal
   * @throws Error if the database update fails
   */
  async toggleGoalPin(goalId: string, isPinned: boolean): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .update({ is_pinned: isPinned })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Reorders goals by updating their priority_order based on array position.
   * @param spaceId - The space ID
   * @param goalIds - Array of goal IDs in the desired order
   */
  async reorderGoals(spaceId: string, goalIds: string[]): Promise<void> {
    const supabase = createClient();

    // Update priority_order for each goal
    const updates = goalIds.map((goalId, index) => ({
      id: goalId,
      priority_order: index + 1,
    }));

    for (const update of updates) {
      await supabase
        .from('goals')
        .update({ priority_order: update.priority_order })
        .eq('id', update.id)
        .eq('space_id', spaceId);
    }
  },

  /**
   * Retrieves aggregated goal statistics for a space.
   * Results are cached for 5 minutes.
   *
   * Stats calculation:
   * - active: Goals with status='active' (regardless of progress)
   * - completed: Completed goals + completed milestones (both count as achievements)
   * - inProgress: Active goals where 0 < progress < 100
   * - milestonesReached: Count of milestones with completed=true
   *
   * The "completed" stat includes milestones because completing a milestone
   * is a meaningful achievement worth celebrating, not just completing entire goals.
   *
   * @param spaceId - The space ID
   * @returns Statistics including active, completed, in-progress counts and milestones reached
   */
  async getGoalStats(spaceId: string): Promise<GoalStats> {
    const cacheKey = cacheKeys.goalStats(spaceId);

    return cacheAside(
      cacheKey,
      async () => {
        const goals = await this.getGoals(spaceId);

        // Count completed milestones across all goals
        let completedMilestones = 0;
        goals.forEach(goal => {
          if (goal.milestones) {
            completedMilestones += goal.milestones.filter((m: Milestone) => m.completed).length;
          }
        });

        // Total "completed" achievements = finished goals + finished milestones
        const completedGoals = goals.filter(g => g.status === 'completed').length;
        const totalCompleted = completedGoals + completedMilestones;

        return {
          active: goals.filter(g => g.status === 'active').length,
          completed: totalCompleted,
          inProgress: goals.filter(g => g.status === 'active' && g.progress > 0 && g.progress < 100).length,
          milestonesReached: completedMilestones,
        };
      },
      CACHE_TTL.MEDIUM // 5 minutes - goal stats don't change very frequently
    );
  },
};
