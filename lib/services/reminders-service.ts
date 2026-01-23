import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cacheAside, cacheKeys, CACHE_TTL } from '@/lib/cache';

export interface Reminder {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  emoji?: string;
  category?: 'bills' | 'health' | 'work' | 'personal' | 'household';
  reminder_type?: 'time' | 'location';
  reminder_time?: string;
  remind_at?: string; // Database field for reminder time
  location?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'completed' | 'snoozed';
  completed?: boolean; // Database field for completion status
  snooze_until?: string;
  snoozed_by?: string; // User ID who snoozed this reminder
  snoozer?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  repeat_pattern?: string;
  repeat_days?: number[];
  assigned_to?: string; // User ID this reminder is assigned to
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  linked_bill_id?: string; // Link to bill if this reminder is for a bill payment
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface CreateReminderInput {
  space_id: string;
  title: string;
  description?: string;
  emoji?: string;
  category?: 'bills' | 'health' | 'work' | 'personal' | 'household';
  reminder_type?: 'time' | 'location';
  reminder_time?: string;
  location?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'active' | 'completed' | 'snoozed';
  snooze_until?: string;
  repeat_pattern?: string;
  repeat_days?: number[];
  assigned_to?: string; // User ID to assign this reminder to
  linked_bill_id?: string; // Link to bill if this reminder is for a bill payment
}

export interface UpdateReminderInput extends Partial<CreateReminderInput> {
  snoozed_by?: string;
  completed_at?: string;
}

export interface ReminderStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
}

type ReminderUpdatePayload = Omit<UpdateReminderInput, 'completed_at'> & {
  completed_at?: string | null;
};

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

export const remindersService = {
  async getReminders(spaceId: string, supabaseClient?: SupabaseClient): Promise<Reminder[]> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        assignee:assigned_to (
          id,
          name,
          email,
          avatar_url
        ),
        snoozer:snoozed_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('space_id', spaceId)
      .order('reminder_time', { ascending: true });

    if (error) throw error;
    const reminders = (data ?? []) as Reminder[];
    return reminders.map((reminder) => ({
      ...reminder,
      assignee: reminder.assignee || undefined,
      snoozer: reminder.snoozer || undefined,
    }));
  },

  async getReminderById(id: string, supabaseClient?: SupabaseClient): Promise<Reminder | null> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createReminder(input: CreateReminderInput, supabaseClient?: SupabaseClient): Promise<Reminder> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('reminders')
      .insert([{
        ...input,
        emoji: input.emoji || '🔔',
        category: input.category || 'personal',
        priority: input.priority || 'medium',
        status: input.status || 'active',
        remind_at: input.reminder_time, // Populate original field for backwards compatibility
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateReminder(id: string, updates: UpdateReminderInput, supabaseClient?: SupabaseClient): Promise<Reminder> {
    const supabase = getSupabaseClient(supabaseClient);
    const finalUpdates: ReminderUpdatePayload = { ...updates };

    // Set completed_at timestamp when status is completed
    if (updates.status === 'completed' && !finalUpdates.completed_at) {
      finalUpdates.completed_at = new Date().toISOString();
    }

    // Clear completed_at if changing from completed
    if (updates.status && updates.status !== 'completed') {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('reminders')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReminder(id: string, supabaseClient?: SupabaseClient): Promise<void> {
    const supabase = getSupabaseClient(supabaseClient);
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getReminderStats(spaceId: string): Promise<ReminderStats> {
    return cacheAside(
      cacheKeys.reminderStats(spaceId),
      async () => {
        const supabase = createClient();
        const now = new Date().toISOString();

        // Run all COUNT queries in parallel for efficiency
        const [totalResult, activeResult, completedResult, overdueResult] = await Promise.all([
          supabase
            .from('reminders')
            .select('*', { count: 'exact', head: true })
            .eq('space_id', spaceId),
          supabase
            .from('reminders')
            .select('*', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .eq('status', 'active'),
          supabase
            .from('reminders')
            .select('*', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .eq('status', 'completed'),
          supabase
            .from('reminders')
            .select('*', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .eq('status', 'active')
            .lt('reminder_time', now),
        ]);

        return {
          total: totalResult.count ?? 0,
          active: activeResult.count ?? 0,
          completed: completedResult.count ?? 0,
          overdue: overdueResult.count ?? 0,
        };
      },
      CACHE_TTL.SHORT // 1 minute - stats change frequently
    );
  },

  async snoozeReminder(id: string, minutes: number, userId: string): Promise<Reminder> {
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

    return this.updateReminder(id, {
      status: 'snoozed',
      snooze_until: snoozeUntil.toISOString(),
      snoozed_by: userId,
    });
  },

  // Assignment filtering functions
  async getAssignedReminders(userId: string, spaceId: string): Promise<Reminder[]> {
    const supabase = createClient();

    // Security: Validate user has access to this space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('id')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      throw new Error('User is not a member of this space');
    }

    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        assignee:assigned_to (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('space_id', spaceId)
      .eq('assigned_to', userId)
      .order('reminder_time', { ascending: true });

    if (error) throw error;
    const reminders = (data ?? []) as Reminder[];
    return reminders.map((reminder) => ({
      ...reminder,
      assignee: reminder.assignee || undefined,
    }));
  },

  async getUnassignedReminders(spaceId: string): Promise<Reminder[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        assignee:assigned_to (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('space_id', spaceId)
      .is('assigned_to', null)
      .order('reminder_time', { ascending: true });

    if (error) throw error;
    const reminders = (data ?? []) as Reminder[];
    return reminders.map((reminder) => ({
      ...reminder,
      assignee: reminder.assignee || undefined,
    }));
  },

  /**
   * Mark the linked bill as paid from a reminder
   * This allows users to mark bills paid directly from the Reminders page
   */
  async markBillPaidFromReminder(reminderId: string): Promise<{ success: boolean; billId?: string }> {
    // Get the reminder to find the linked bill
    const reminder = await this.getReminderById(reminderId);
    if (!reminder) {
      throw new Error('Reminder not found');
    }

    if (!reminder.linked_bill_id) {
      throw new Error('This reminder is not linked to a bill');
    }

    // Import bills service dynamically to avoid circular dependencies
    const { billsService } = await import('./bills-service');

    // Mark the bill as paid (this will also complete this reminder via markBillAsPaid)
    await billsService.markBillAsPaid(reminder.linked_bill_id);

    return { success: true, billId: reminder.linked_bill_id };
  },

  /**
   * Get reminders that are linked to bills (for unified bill reminder dashboard)
   */
  async getBillReminders(spaceId: string): Promise<Reminder[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        assignee:assigned_to (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('space_id', spaceId)
      .not('linked_bill_id', 'is', null)
      .order('reminder_time', { ascending: true });

    if (error) throw error;
    const reminders = (data ?? []) as Reminder[];
    return reminders.map((reminder) => ({
      ...reminder,
      assignee: reminder.assignee || undefined,
    }));
  },
};
