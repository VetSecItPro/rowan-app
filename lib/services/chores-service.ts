import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeSearchInput } from '@/lib/utils';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Chore } from '@/lib/types';
import { pointsService } from '@/lib/services/rewards';
import type { PointTransaction } from '@/lib/types/rewards';
import { logger } from '@/lib/logger';

// Chore Types - using main types file interface

export interface CreateChoreInput {
  space_id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'once';
  assigned_to?: string;
  status?: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed';
  due_date?: string;
  notes?: string;
  sort_order?: number;
  created_by: string;
  point_value?: number; // Points awarded for completing this chore (default: 10)
  category?: string;
}

export interface UpdateChoreInput {
  title?: string;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'once';
  assigned_to?: string;
  status?: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed';
  due_date?: string;
  completed_at?: string | null;
  notes?: string | null;
  sort_order?: number;
  calendar_sync?: boolean;
  category?: string | null;
  point_value?: number;
}

export interface ChoreQueryOptions {
  status?: string;
  frequency?: string;
  assigned_to?: string;
  search?: string;
}

export interface ChoreStats {
  total: number;
  completedThisWeek: number;
  myChores: number;
  partnerChores: number;
}

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

/**
 * Chores Service
 *
 * Manages household chores with full CRUD operations, real-time subscriptions, and rewards integration.
 * Supports frequency-based tracking, user assignments, drag-and-drop ordering, and point-based rewards.
 */
export const choresService = {
  /**
   * Retrieves all chores for a space with optional filtering.
   * @param spaceId - The space identifier
   * @param options - Optional query options for filtering by status, frequency, user, or search
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns Array of chores sorted by sort_order then created_at
   * @throws Error if database query fails
   */
  async getChores(spaceId: string, options?: ChoreQueryOptions, supabaseClient?: SupabaseClient): Promise<Chore[]> {
    const supabase = getSupabaseClient(supabaseClient);

    try {
      let query = supabase
        .from('chores')
        .select('id, space_id, title, description, frequency, assigned_to, status, due_date, completed_at, completion_percentage, notes, created_by, created_at, updated_at, sort_order, calendar_sync, category, point_value, late_penalty_enabled, late_penalty_points, grace_period_hours, penalty_applied_at, penalty_points_deducted')
        .eq('space_id', spaceId);

      // Apply filters if provided
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.frequency) {
        query = query.eq('frequency', options.frequency);
      }
      if (options?.assigned_to) {
        query = query.eq('assigned_to', options.assigned_to);
      }
      if (options?.search) {
        // Search in title and description (sanitized to prevent SQL injection)
        const sanitizedSearch = sanitizeSearchInput(options.search);
        if (sanitizedSearch) {
          query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
        }
      }

      // Try to order by sort_order first, fallback to created_at if column doesn't exist
      try {
        query = query.order('sort_order', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: false });
      } catch (sortError) {
        // Fallback to created_at only if sort_order column doesn't exist
        logger.warn('sort_order column may not exist, using created_at ordering', { component: 'lib-chores-service', error: sortError });
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        logger.error('❌ getChores Supabase error:', error, { component: 'lib-chores-service', action: 'service_call' });
        throw new Error(`Failed to fetch chores: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('❌ Error in getChores:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Retrieves a single chore by ID.
   * @param id - The chore identifier
   * @returns The chore or null if not found
   * @throws Error if database query fails
   */
  async getChoreById(id: string): Promise<Chore | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('id, space_id, title, description, frequency, assigned_to, status, due_date, completed_at, completion_percentage, notes, created_by, created_at, updated_at, sort_order, calendar_sync, category, point_value, late_penalty_enabled, late_penalty_points, grace_period_hours, penalty_applied_at, penalty_points_deducted')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch chore: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('Error in getChoreById:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Creates a new chore.
   * @param data - Chore creation data including title, frequency, and space_id
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns The newly created chore
   * @throws Error if database insert fails
   */
  async createChore(data: CreateChoreInput, supabaseClient?: SupabaseClient): Promise<Chore> {
    const supabase = getSupabaseClient(supabaseClient);

    try {
      const { data: chore, error } = await supabase
        .from('chores')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create chore: ${error.message}`);
      }

      return chore;
    } catch (error) {
      logger.error('Error in createChore:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Updates a chore. Automatically manages completed_at timestamp based on status.
   * @param id - The chore identifier
   * @param updates - Partial chore data to update
   * @returns The updated chore
   * @throws Error if database update fails
   */
  async updateChore(id: string, updates: UpdateChoreInput, supabaseClient?: SupabaseClient): Promise<Chore> {
    const supabase = supabaseClient ?? createClient();
    try {
      // Handle completed_at timestamp automatically
      const finalUpdates: UpdateChoreInput = { ...updates };

      // If marking as completed, set completed_at timestamp
      if (updates.status === 'completed' && !finalUpdates.completed_at) {
        finalUpdates.completed_at = new Date().toISOString();
      }

      // If changing from completed to another status, clear completed_at
      if (updates.status && updates.status !== 'completed') {
        finalUpdates.completed_at = null;
      }

      const { data, error } = await supabase
        .from('chores')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update chore: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('Error in updateChore:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Deletes a chore.
   * @param id - The chore identifier
   * @throws Error if database delete fails
   */
  async deleteChore(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete chore: ${error.message}`);
      }
    } catch (error) {
      logger.error('Error in deleteChore:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Updates chore sort order for drag and drop reordering.
   * @param id - The chore identifier
   * @param newSortOrder - New sort order position
   * @returns The updated chore
   * @throws Error if database update fails
   */
  async updateChoreOrder(id: string, newSortOrder: number): Promise<Chore> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('chores')
        .update({ sort_order: newSortOrder })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Handle case where sort_order column might not exist
        if (error.code === '42703') {
          logger.warn('sort_order column does not exist, skipping order update', { component: 'lib-chores-service' });
          // Return the chore without updating order
          const { data: choreData, error: fetchError } = await supabase
            .from('chores')
            .select('id, space_id, title, description, frequency, assigned_to, status, due_date, completed_at, completion_percentage, notes, created_by, created_at, updated_at, sort_order, calendar_sync, category, point_value, late_penalty_enabled, late_penalty_points, grace_period_hours, penalty_applied_at, penalty_points_deducted')
            .eq('id', id)
            .single();

          if (fetchError) throw fetchError;
          return choreData;
        }
        throw new Error(`Failed to update chore order: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('Error in updateChoreOrder:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Bulk updates chore sort orders for drag and drop reordering.
   * @param updates - Array of {id, sort_order} objects
   * @throws Error if any update fails
   */
  async bulkUpdateChoreOrder(updates: Array<{id: string; sort_order: number}>): Promise<void> {
    try {
      // Update all chore sort orders in parallel (FIX-020: eliminates N+1)
      await Promise.all(
        updates.map(update => this.updateChoreOrder(update.id, update.sort_order))
      );
    } catch (error) {
      logger.error('Error in bulkUpdateChoreOrder:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Retrieves chores assigned to a specific user.
   * @param spaceId - The space identifier
   * @param userId - The user identifier
   * @returns Array of chores assigned to the user
   * @throws Error if database query fails
   */
  async getChoresByUser(spaceId: string, userId: string): Promise<Chore[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('id, space_id, title, description, frequency, assigned_to, status, due_date, completed_at, completion_percentage, notes, created_by, created_at, updated_at, sort_order, calendar_sync, category, point_value, late_penalty_enabled, late_penalty_points, grace_period_hours, penalty_applied_at, penalty_points_deducted')
        .eq('space_id', spaceId)
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user chores: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getChoresByUser:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Retrieves chores filtered by frequency.
   * @param spaceId - The space identifier
   * @param frequency - Frequency filter (daily, weekly, biweekly, monthly, once)
   * @returns Array of chores with the specified frequency
   * @throws Error if database query fails
   */
  async getChoresByFrequency(spaceId: string, frequency: string): Promise<Chore[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('id, space_id, title, description, frequency, assigned_to, status, due_date, completed_at, completion_percentage, notes, created_by, created_at, updated_at, sort_order, calendar_sync, category, point_value, late_penalty_enabled, late_penalty_points, grace_period_hours, penalty_applied_at, penalty_points_deducted')
        .eq('space_id', spaceId)
        .eq('frequency', frequency)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch chores by frequency: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getChoresByFrequency:', error, { component: 'lib-chores-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Subscribes to real-time chore changes for a space.
   * @param spaceId - The space identifier
   * @param callback - Function called when chores change (INSERT/UPDATE/DELETE)
   * @returns RealtimeChannel for unsubscription
   */
  subscribeToChores(
    spaceId: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Chore | null;
      old: Chore | null;
    }) => void
  ): RealtimeChannel {
    const supabase = createClient();
    return supabase
      .channel(`chores:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chores',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as unknown as Chore | null,
            old: payload.old as unknown as Chore | null,
          });
        }
      )
      .subscribe();
  },

  /**
   * Retrieves chore statistics for a space.
   * @param spaceId - The space identifier
   * @param currentUserId - Current user's ID for ownership calculations
   * @returns Statistics including total, completed this week, my chores, and partner chores
   */
  async getChoreStats(spaceId: string, currentUserId: string): Promise<ChoreStats> {
    const chores = await this.getChores(spaceId);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total: chores.length,
      completedThisWeek: chores.filter(c =>
        c.status === 'completed' &&
        c.completed_at &&
        new Date(c.completed_at) >= weekAgo
      ).length,
      myChores: chores.filter(c => c.assigned_to === currentUserId && c.status === 'pending').length,
      partnerChores: chores.filter(c => c.assigned_to !== currentUserId && c.status === 'pending').length,
    };
  },

  /**
   * Completes a chore and awards points with streak tracking.
   * @param choreId - The chore identifier
   * @param userId - User who completed the chore
   * @returns Object with updated chore, points awarded, streak bonus, and transaction
   * @throws Error if chore not found or already completed
   */
  async completeChoreWithRewards(
    choreId: string,
    userId: string
  ): Promise<{
    chore: Chore;
    pointsAwarded: number;
    streakBonus: number;
    newStreak: number;
    transaction: PointTransaction;
  }> {
    // Get the chore first
    const chore = await this.getChoreById(choreId);
    if (!chore) {
      throw new Error('Chore not found');
    }

    if (chore.status === 'completed') {
      throw new Error('Chore is already completed');
    }

    // Update the chore status
    const updatedChore = await this.updateChore(choreId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // Get point value from chore (falls back to default if not set)
    const choreWithPoints = chore as Chore & { point_value?: number };
    const basePoints = choreWithPoints.point_value ?? 10;

    // Award points with streak tracking
    try {
      const result = await pointsService.awardChorePoints(
        userId,
        chore.space_id,
        choreId,
        chore.title,
        basePoints
      );

      return {
        chore: updatedChore,
        pointsAwarded: basePoints + result.streakBonus,
        streakBonus: result.streakBonus,
        newStreak: result.newStreak,
        transaction: result.transaction,
      };
    } catch (pointsError) {
      // Points award failed, but chore is still completed
      logger.error('Failed to award points for chore completion:', pointsError, { component: 'lib-chores-service', action: 'service_call' });
      // Return without points info - chore is completed at least
      return {
        chore: updatedChore,
        pointsAwarded: 0,
        streakBonus: 0,
        newStreak: 0,
        transaction: {} as PointTransaction,
      };
    }
  },

  /**
   * Reverts a completed chore to pending status. Does not refund points.
   * @param choreId - The chore identifier
   * @returns The updated chore with pending status
   */
  async uncompleteChore(choreId: string): Promise<Chore> {
    return this.updateChore(choreId, {
      status: 'pending',
      completed_at: null,
    });
  },

  /**
   * Completes a chore via API with full rewards and late penalty support.
   * Preferred method as it handles server-side penalty calculations.
   * @param choreId - The chore identifier
   * @returns Object with success flag, chore, rewards, penalty info, and net points
   */
  async completeChoreViaAPI(
    choreId: string
  ): Promise<{
    success: boolean;
    chore?: Chore;
    rewards?: {
      pointsAwarded: number;
      streakBonus: number;
      newStreak: number;
    };
    penalty?: {
      applied: boolean;
      pointsDeducted: number;
      daysLate: number;
    };
    netPoints?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to complete chore',
        };
      }

      return {
        success: true,
        chore: data.chore,
        rewards: data.rewards,
        penalty: data.penalty,
        netPoints: data.netPoints,
      };
    } catch (error) {
      logger.error('Error completing chore via API:', error, { component: 'lib-chores-service', action: 'service_call' });
      return {
        success: false,
        error: 'Network error',
      };
    }
  },
};
