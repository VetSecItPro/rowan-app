import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Chore Types
export interface Chore {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  assigned_to?: string;
  status: 'pending' | 'completed' | 'skipped';
  due_date?: string;
  completed_at?: string;
  completion_percentage?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChoreInput {
  space_id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  assigned_to?: string;
  status?: 'pending' | 'completed' | 'skipped';
  due_date?: string;
}

export interface UpdateChoreInput {
  title?: string;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'once';
  assigned_to?: string;
  status?: 'pending' | 'completed' | 'skipped';
  due_date?: string;
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
   * Get all chores for a space
   *
   * @param spaceId - The space ID to fetch chores from
   * @returns Promise<Chore[]> - Array of chores
   */
  async getChores(spaceId: string): Promise<Chore[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch chores: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getChores:', error);
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
