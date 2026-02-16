/**
 * Admin Goals Service
 *
 * Service layer for managing OKR/Goals in the admin dashboard.
 * All operations use the Supabase admin client for elevated privileges.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export interface AdminGoal {
  id: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminGoalInput {
  metric_name: string;
  target_value: number;
  current_value?: number;
  unit: string;
  deadline?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface UpdateAdminGoalInput {
  metric_name?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  deadline?: string | null;
  notes?: string | null;
  status?: string;
}

/**
 * Admin Goals Service
 * Provides CRUD operations for admin_goals table
 */
export const adminGoalsService = {
  /**
   * Get all active goals
   * @returns Promise<AdminGoal[]> - Array of active goals ordered by created_at
   */
  async getGoals(): Promise<AdminGoal[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('admin_goals')
        .select('id, metric_name, target_value, current_value, unit, deadline, status, notes, created_by, created_at, updated_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch admin goals:', error, {
          component: 'lib-admin-goals-service',
          action: 'get_goals',
        });
        throw new Error('Failed to fetch goals');
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getGoals:', error, {
        component: 'lib-admin-goals-service',
        action: 'get_goals',
      });
      throw error;
    }
  },

  /**
   * Create a new goal
   * @param data - Goal creation data
   * @returns Promise<AdminGoal> - The created goal
   */
  async createGoal(data: CreateAdminGoalInput): Promise<AdminGoal> {
    try {
      const { data: goal, error } = await supabaseAdmin
        .from('admin_goals')
        .insert({
          metric_name: data.metric_name,
          target_value: data.target_value,
          current_value: data.current_value ?? 0,
          unit: data.unit,
          deadline: data.deadline ?? null,
          notes: data.notes ?? null,
          created_by: data.created_by ?? null,
          status: 'active',
        })
        .select('id, metric_name, target_value, current_value, unit, deadline, status, notes, created_by, created_at, updated_at')
        .single();

      if (error) {
        logger.error('Failed to create admin goal:', error, {
          component: 'lib-admin-goals-service',
          action: 'create_goal',
        });
        throw new Error('Failed to create goal');
      }

      return goal;
    } catch (error) {
      logger.error('Error in createGoal:', error, {
        component: 'lib-admin-goals-service',
        action: 'create_goal',
      });
      throw error;
    }
  },

  /**
   * Update an existing goal
   * @param id - Goal ID
   * @param data - Goal update data
   * @returns Promise<AdminGoal> - The updated goal
   */
  async updateGoal(id: string, data: UpdateAdminGoalInput): Promise<AdminGoal> {
    try {
      const { data: goal, error } = await supabaseAdmin
        .from('admin_goals')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, metric_name, target_value, current_value, unit, deadline, status, notes, created_by, created_at, updated_at')
        .single();

      if (error) {
        logger.error('Failed to update admin goal:', error, {
          component: 'lib-admin-goals-service',
          action: 'update_goal',
          goal_id: id,
        });
        throw new Error('Failed to update goal');
      }

      return goal;
    } catch (error) {
      logger.error('Error in updateGoal:', error, {
        component: 'lib-admin-goals-service',
        action: 'update_goal',
        goal_id: id,
      });
      throw error;
    }
  },

  /**
   * Soft delete a goal (set status to 'archived')
   * @param id - Goal ID
   * @returns Promise<void>
   */
  async deleteGoal(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('admin_goals')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        logger.error('Failed to delete admin goal:', error, {
          component: 'lib-admin-goals-service',
          action: 'delete_goal',
          goal_id: id,
        });
        throw new Error('Failed to delete goal');
      }
    } catch (error) {
      logger.error('Error in deleteGoal:', error, {
        component: 'lib-admin-goals-service',
        action: 'delete_goal',
        goal_id: id,
      });
      throw error;
    }
  },
};
