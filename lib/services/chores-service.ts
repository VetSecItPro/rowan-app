import { createClient } from '@/lib/supabase/client';
import { sanitizeSearchInput } from '@/lib/utils';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Chore } from '@/lib/types';

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
  created_by: string; // Required field that was missing!
}

export interface UpdateChoreInput {
  title?: string;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'once';
  assigned_to?: string;
  status?: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed';
  due_date?: string;
  completed_at?: string | null;
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

/**
 * Chores Service
 *
 * Service for managing household chores with full CRUD operations and real-time subscriptions.
 *
 * Features:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Frequency-based chore tracking
 * - Real-time subscriptions
 * - User assignment support
 */
export const choresService = {
  /**
   * Get all chores for a space with optional filtering
   *
   * @param spaceId - The space ID to fetch chores from
   * @param options - Optional query options for filtering
   * @returns Promise<Chore[]> - Array of chores
   */
  async getChores(spaceId: string, options?: ChoreQueryOptions): Promise<Chore[]> {
    const supabase = createClient();

    try {
      let query = supabase
        .from('chores')
        .select('*')
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
        console.warn('sort_order column may not exist, using created_at ordering:', sortError);
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ getChores Supabase error:', error);
        throw new Error(`Failed to fetch chores: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getChores:', error);
      throw error;
    }
  },

  /**
   * Get a single chore by ID
   *
   * @param id - Chore ID
   * @returns Promise<Chore | null> - Chore or null if not found
   */
  async getChoreById(id: string): Promise<Chore | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
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
      console.error('Error in getChoreById:', error);
      throw error;
    }
  },

  /**
   * Create a new chore
   *
   * @param data - Chore creation data
   * @returns Promise<Chore> - Created chore
   */
  async createChore(data: CreateChoreInput): Promise<Chore> {
    const supabase = createClient();

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
      console.error('Error in createChore:', error);
      throw error;
    }
  },

  /**
   * Update a chore
   * Automatically sets completed_at timestamp when status is changed to 'completed'
   *
   * @param id - Chore ID
   * @param updates - Partial chore data to update
   * @returns Promise<Chore> - Updated chore
   */
  async updateChore(id: string, updates: UpdateChoreInput): Promise<Chore> {
    const supabase = createClient();
    try {
      // Handle completed_at timestamp automatically
      const finalUpdates: any = { ...updates };

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
      console.error('Error in updateChore:', error);
      throw error;
    }
  },

  /**
   * Delete a chore
   *
   * @param id - Chore ID
   * @returns Promise<void>
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
      console.error('Error in deleteChore:', error);
      throw error;
    }
  },

  /**
   * Update chore sort order for drag and drop
   *
   * @param id - Chore ID
   * @param newSortOrder - New sort order position
   * @returns Promise<Chore> - Updated chore
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
          console.warn('sort_order column does not exist, skipping order update');
          // Return the chore without updating order
          const { data: choreData, error: fetchError } = await supabase
            .from('chores')
            .select('*')
            .eq('id', id)
            .single();

          if (fetchError) throw fetchError;
          return choreData;
        }
        throw new Error(`Failed to update chore order: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateChoreOrder:', error);
      throw error;
    }
  },

  /**
   * Bulk update chore sort orders for drag and drop
   *
   * @param updates - Array of {id, sort_order} objects
   * @returns Promise<void>
   */
  async bulkUpdateChoreOrder(updates: Array<{id: string; sort_order: number}>): Promise<void> {
    const supabase = createClient();
    try {
      for (const update of updates) {
        await this.updateChoreOrder(update.id, update.sort_order);
      }
    } catch (error) {
      console.error('Error in bulkUpdateChoreOrder:', error);
      throw error;
    }
  },

  /**
   * Get chores assigned to a specific user
   *
   * @param spaceId - Space ID
   * @param userId - User ID
   * @returns Promise<Chore[]> - Chores assigned to user
   */
  async getChoresByUser(spaceId: string, userId: string): Promise<Chore[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('space_id', spaceId)
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user chores: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getChoresByUser:', error);
      throw error;
    }
  },

  /**
   * Get chores by frequency
   *
   * @param spaceId - Space ID
   * @param frequency - Frequency filter (daily, weekly, monthly, once)
   * @returns Promise<Chore[]> - Chores with specified frequency
   */
  async getChoresByFrequency(spaceId: string, frequency: string): Promise<Chore[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('space_id', spaceId)
        .eq('frequency', frequency)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch chores by frequency: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getChoresByFrequency:', error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time chore changes for a space
   *
   * @param spaceId - Space ID to subscribe to
   * @param callback - Callback function called when chores change
   * @returns RealtimeChannel - Channel object with unsubscribe method
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
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Chore | null,
            old: payload.old as Chore | null,
          });
        }
      )
      .subscribe();
  },

  /**
   * Get chore statistics for a space
   *
   * @param spaceId - Space ID
   * @param currentUserId - Current user ID
   * @returns Promise<ChoreStats> - Chore statistics
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
};
