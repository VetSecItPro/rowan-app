/**
 * Milestone Service — CRUD operations for goal milestones.
 *
 * @module goals/milestone-service
 */

import { createClient } from '@/lib/supabase/client';
import { checkAndAwardBadges } from '../achievement-service';
import { enhancedNotificationService } from '../enhanced-notification-service';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';
import type {
  Milestone,
  CreateMilestoneInput,
  MilestoneUpdatePayload,
} from './types';

/** Service for goal milestone CRUD with completion tracking and badge awarding. */
export const milestoneService = {
  /**
   * Creates a new milestone for a goal.
   * @param input - Milestone creation data including goal_id, title, and type
   * @returns The newly created milestone
   * @throws Error if the database insert fails
   */
  async createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_milestones')
      .insert([{
        ...input,
        completed: false,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates a milestone with the provided changes.
   * @param id - The milestone ID to update
   * @param updates - Partial milestone data to apply
   * @returns The updated milestone
   * @throws Error if the database update fails
   */
  async updateMilestone(id: string, updates: Partial<CreateMilestoneInput>): Promise<Milestone> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_milestones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Toggles a milestone's completion status.
   * Sets or clears completed_at timestamp accordingly.
   * Triggers badge checks and notifications on completion.
   * @param id - The milestone ID to toggle
   * @param completed - Whether the milestone is completed
   * @returns The updated milestone
   * @throws Error if the database update fails
   */
  async toggleMilestone(id: string, completed: boolean): Promise<Milestone> {
    const supabase = createClient();
    const finalUpdates: MilestoneUpdatePayload = { completed };

    // Check if milestone is being completed
    const isBeingCompleted = completed && !finalUpdates.completed_at;

    if (completed) {
      finalUpdates.completed_at = new Date().toISOString();
    } else {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('goal_milestones')
      .update(finalUpdates)
      .eq('id', id)
      .select(`
        *,
        goal:goals!goal_id!inner(space_id)
      `)
      .single();

    if (error) throw error;

    // Check for badge awards and send notifications when milestone is completed
    if (isBeingCompleted && data.goal?.space_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Trigger badge checking in the background (don't await to avoid blocking)
          checkAndAwardBadges(user.id, data.goal.space_id).catch((error) => logger.error('Caught error', error, { component: 'lib-goals-service', action: 'service_call' }));

          // Get goal details, user name and space info for notifications
          const [{ data: goalData }, { data: userData }, { data: spaceData }] = await Promise.all([
            supabase.from('goals').select('title').eq('id', data.goal_id).single(),
            supabase.from('users').select('name').eq('id', user.id).single(),
            supabase.from('spaces').select('name').eq('id', data.goal.space_id).single()
          ]);

          // Get space members to notify
          const spaceMembers = await enhancedNotificationService.getSpaceMembers(data.goal.space_id);

          // Send milestone completion notifications
          if (spaceMembers.length > 0 && goalData) {
            enhancedNotificationService.sendGoalAchievementNotification(
              spaceMembers.map(member => member.user_id),
              {
                goalTitle: goalData.title,
                goalId: data.goal_id,
                goalUrl: `${getAppUrl()}/goals/${data.goal_id}?space_id=${data.goal.space_id}`,
                achievementType: 'milestone_reached',
                completedBy: userData?.name || 'Someone',
                completionDate: finalUpdates.completed_at || new Date().toISOString(),
                spaceName: spaceData?.name || 'Your Space',
                milestoneTitle: data.title,
              }
            ).catch((error) => logger.error('Caught error', error, { component: 'lib-goals-service', action: 'service_call' }));
          }
        }
      } catch (error) {
        logger.error('Failed to check for achievement badges or send notifications:', error, { component: 'lib-goals-service', action: 'service_call' });
      }
    }

    return data;
  },

  /**
   * Permanently deletes a milestone.
   * @param id - The milestone ID to delete
   * @throws Error if the database delete fails
   */
  async deleteMilestone(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goal_milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Retrieves all milestones across all goals in a space.
   * @param spaceId - The space ID
   * @returns Array of milestones sorted by creation date descending
   */
  async getAllMilestones(spaceId: string): Promise<Milestone[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_milestones')
      .select('*, goal:goals!goal_id!inner(space_id)')
      .eq('goal.space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Milestone[];
  },
};
