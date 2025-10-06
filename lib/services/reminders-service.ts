import { supabase } from '@/lib/supabase';

export interface Reminder {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  emoji?: string;
  category: 'bills' | 'health' | 'work' | 'personal' | 'household';
  reminder_type?: 'time' | 'location';
  reminder_time?: string;
  location?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'completed' | 'snoozed';
  snooze_until?: string;
  repeat_pattern?: string;
  repeat_days?: number[];
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
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
}

export interface ReminderStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
}

export const remindersService = {
  async getReminders(spaceId: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('space_id', spaceId)
      .order('reminder_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getReminderById(id: string): Promise<Reminder | null> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createReminder(input: CreateReminderInput): Promise<Reminder> {
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

  async updateReminder(id: string, updates: Partial<CreateReminderInput>): Promise<Reminder> {
    const finalUpdates: any = { ...updates };

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

  async deleteReminder(id: string): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getReminderStats(spaceId: string): Promise<ReminderStats> {
    const reminders = await this.getReminders(spaceId);
    const now = new Date();

    return {
      total: reminders.length,
      active: reminders.filter(r => r.status === 'active').length,
      completed: reminders.filter(r => r.status === 'completed').length,
      overdue: reminders.filter(r =>
        r.status === 'active' &&
        r.reminder_time &&
        new Date(r.reminder_time) < now
      ).length,
    };
  },

  async snoozeReminder(id: string, minutes: number): Promise<Reminder> {
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

    return this.updateReminder(id, {
      status: 'snoozed',
      snooze_until: snoozeUntil.toISOString(),
    });
  },
};
