import { createClient } from '@/lib/supabase/client';

// Smart Nudges Service
// Provides intelligent reminders and motivational prompts for goals

export interface NudgeSettings {
  id: string;
  user_id: string;
  space_id: string;
  nudges_enabled: boolean;
  daily_nudges_enabled: boolean;
  weekly_summary_enabled: boolean;
  milestone_reminders_enabled: boolean;
  deadline_alerts_enabled: boolean;
  motivation_quotes_enabled: boolean;
  preferred_nudge_time: string;
  preferred_timezone: string;
  nudge_frequency_days: number;
  max_daily_nudges: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  weekend_nudges_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NudgeTemplate {
  id: string;
  name: string;
  category: 'reminder' | 'motivation' | 'milestone' | 'deadline' | 'celebration' | 'summary';
  trigger_type: string;
  title: string;
  message: string;
  action_text?: string;
  icon?: string;
  goal_categories?: string[];
  days_before_deadline?: number;
  days_since_activity?: number;
  priority: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface NudgeHistory {
  id: string;
  user_id: string;
  space_id: string;
  goal_id?: string;
  template_id?: string;
  title: string;
  message: string;
  category: string;
  trigger_type: string;
  delivery_method: string;
  sent_at: string;
  read_at?: string;
  clicked_at?: string;
  dismissed_at?: string;
  was_effective?: boolean;
  effectiveness_score?: number;
  created_at: string;
}

export interface GoalNudgeTracking {
  id: string;
  goal_id: string;
  user_id: string;
  last_nudge_sent_at?: string;
  last_activity_at?: string;
  nudge_count: number;
  is_snoozed: boolean;
  snoozed_until?: string;
  custom_nudge_enabled: boolean;
  custom_nudge_frequency_days?: number;
  created_at: string;
  updated_at: string;
}

export interface SmartNudge {
  nudge_id: string;
  goal_id?: string;
  goal_title?: string;
  template_name: string;
  category: string;
  title: string;
  message: string;
  action_text?: string;
  icon?: string;
  priority: number;
  days_since_activity?: number;
  days_until_deadline?: number;
  should_send: boolean;
}

export interface CreateNudgeSettingsInput {
  space_id: string;
  nudges_enabled?: boolean;
  daily_nudges_enabled?: boolean;
  weekly_summary_enabled?: boolean;
  milestone_reminders_enabled?: boolean;
  deadline_alerts_enabled?: boolean;
  motivation_quotes_enabled?: boolean;
  preferred_nudge_time?: string;
  preferred_timezone?: string;
  nudge_frequency_days?: number;
  max_daily_nudges?: number;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  weekend_nudges_enabled?: boolean;
}

export interface UpdateNudgeSettingsInput extends Partial<CreateNudgeSettingsInput> {
  id: string;
}

class SmartNudgesService {
  private supabase = createClient();

  // Get user's nudge settings
  async getNudgeSettings(userId: string, spaceId: string): Promise<NudgeSettings | null> {
    const { data, error } = await this.supabase
      .from('nudge_settings')
      .select('id, user_id, space_id, nudges_enabled, daily_nudges_enabled, weekly_summary_enabled, milestone_reminders_enabled, deadline_alerts_enabled, motivation_quotes_enabled, preferred_nudge_time, preferred_timezone, nudge_frequency_days, max_daily_nudges, quiet_hours_start, quiet_hours_end, weekend_nudges_enabled, created_at, updated_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  // Create or update nudge settings
  async upsertNudgeSettings(
    userId: string,
    input: CreateNudgeSettingsInput
  ): Promise<NudgeSettings> {
    const { data, error } = await this.supabase
      .from('nudge_settings')
      .upsert({
        user_id: userId,
        ...input,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,space_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get smart nudges for a user
  async getSmartNudges(
    userId: string,
    spaceId: string,
    limit = 10
  ): Promise<SmartNudge[]> {
    const { data, error } = await this.supabase
      .rpc('get_smart_nudges', {
        p_user_id: userId,
        p_space_id: spaceId,
        p_limit: limit
      });

    if (error) throw error;
    return data || [];
  }

  // Get all nudge templates
  async getNudgeTemplates(category?: string): Promise<NudgeTemplate[]> {
    let query = this.supabase
      .from('nudge_templates')
      .select('id, name, category, trigger_type, title, message, action_text, icon, goal_categories, days_before_deadline, days_since_activity, priority, is_active, is_system, created_at, updated_at')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  // Record nudge history
  async recordNudgeHistory(
    userId: string,
    spaceId: string,
    nudge: SmartNudge,
    deliveryMethod = 'in_app'
  ): Promise<NudgeHistory> {
    const { data, error } = await this.supabase
      .from('nudge_history')
      .insert({
        user_id: userId,
        space_id: spaceId,
        goal_id: nudge.goal_id,
        title: nudge.title,
        message: nudge.message,
        category: nudge.category,
        trigger_type: nudge.template_name,
        delivery_method: deliveryMethod,
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Mark nudge as read
  async markNudgeAsRead(nudgeHistoryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('nudge_history')
      .update({
        read_at: new Date().toISOString()
      })
      .eq('id', nudgeHistoryId);

    if (error) throw error;
  }

  // Mark nudge as clicked/acted upon
  async markNudgeAsClicked(nudgeHistoryId: string, wasEffective = true): Promise<void> {
    const { error } = await this.supabase
      .from('nudge_history')
      .update({
        clicked_at: new Date().toISOString(),
        was_effective: wasEffective
      })
      .eq('id', nudgeHistoryId);

    if (error) throw error;
  }

  // Dismiss nudge
  async dismissNudge(nudgeHistoryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('nudge_history')
      .update({
        dismissed_at: new Date().toISOString()
      })
      .eq('id', nudgeHistoryId);

    if (error) throw error;
  }

  // Snooze goal nudges
  async snoozeGoalNudges(
    goalId: string,
    userId: string,
    hours = 24
  ): Promise<void> {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + hours);

    const { error } = await this.supabase
      .from('goal_nudge_tracking')
      .upsert({
        goal_id: goalId,
        user_id: userId,
        is_snoozed: true,
        snoozed_until: snoozedUntil.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'goal_id,user_id'
      });

    if (error) throw error;
  }

  // Update goal activity (called when goal is updated)
  async updateGoalActivity(goalId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('goal_nudge_tracking')
      .upsert({
        goal_id: goalId,
        user_id: userId,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'goal_id,user_id'
      });

    if (error) throw error;
  }

  // Record nudge sent (called when nudge is sent)
  async recordNudgeSent(goalId: string, userId: string): Promise<void> {
    // First, get the current nudge count
    const { data: existing } = await this.supabase
      .from('goal_nudge_tracking')
      .select('nudge_count')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();

    const newNudgeCount = (existing?.nudge_count || 0) + 1;

    const { error } = await this.supabase
      .from('goal_nudge_tracking')
      .upsert({
        goal_id: goalId,
        user_id: userId,
        last_nudge_sent_at: new Date().toISOString(),
        nudge_count: newNudgeCount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'goal_id,user_id'
      });

    if (error) throw error;
  }

  // Get nudge history for user
  async getNudgeHistory(
    userId: string,
    spaceId: string,
    limit = 50
  ): Promise<NudgeHistory[]> {
    const { data, error } = await this.supabase
      .from('nudge_history')
      .select('id, user_id, space_id, goal_id, template_id, title, message, category, trigger_type, delivery_method, sent_at, read_at, clicked_at, dismissed_at, was_effective, effectiveness_score, created_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Get nudge analytics
  async getNudgeAnalytics(userId: string, spaceId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('nudge_history')
      .select('id, user_id, space_id, goal_id, template_id, title, message, category, trigger_type, delivery_method, sent_at, read_at, clicked_at, dismissed_at, was_effective, effectiveness_score, created_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .gte('sent_at', startDate.toISOString());

    if (error) throw error;

    interface NudgeStats { read_at: string | null; clicked_at: string | null; was_effective: boolean; dismissed_at: string | null; category: string }
    const nudges = (data || []) as NudgeStats[];

    return {
      total_nudges: nudges.length,
      read_nudges: nudges.filter((n: NudgeStats) => n.read_at).length,
      clicked_nudges: nudges.filter((n: NudgeStats) => n.clicked_at).length,
      effective_nudges: nudges.filter((n: NudgeStats) => n.was_effective).length,
      dismissed_nudges: nudges.filter((n: NudgeStats) => n.dismissed_at).length,
      read_rate: nudges.length > 0 ? (nudges.filter((n: NudgeStats) => n.read_at).length / nudges.length) * 100 : 0,
      click_rate: nudges.length > 0 ? (nudges.filter((n: NudgeStats) => n.clicked_at).length / nudges.length) * 100 : 0,
      effectiveness_rate: nudges.length > 0 ? (nudges.filter((n: NudgeStats) => n.was_effective).length / nudges.length) * 100 : 0,
      category_breakdown: nudges.reduce((acc: Record<string, number>, nudge: NudgeStats) => {
        acc[nudge.category] = (acc[nudge.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Get goal nudge tracking
  async getGoalNudgeTracking(goalId: string, userId: string): Promise<GoalNudgeTracking | null> {
    const { data, error } = await this.supabase
      .from('goal_nudge_tracking')
      .select('id, goal_id, user_id, last_nudge_sent_at, last_activity_at, nudge_count, is_snoozed, snoozed_until, custom_nudge_enabled, custom_nudge_frequency_days, created_at, updated_at')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  // Toggle nudges for specific goal
  async toggleGoalNudges(
    goalId: string,
    userId: string,
    enabled: boolean
  ): Promise<void> {
    const { error } = await this.supabase
      .from('goal_nudge_tracking')
      .upsert({
        goal_id: goalId,
        user_id: userId,
        custom_nudge_enabled: enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'goal_id,user_id'
      });

    if (error) throw error;
  }

  // Create custom nudge template
  async createCustomNudgeTemplate(template: Omit<NudgeTemplate, 'id' | 'is_system' | 'created_at' | 'updated_at'>): Promise<NudgeTemplate> {
    const { data, error } = await this.supabase
      .from('nudge_templates')
      .insert({
        ...template,
        is_system: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const smartNudgesService = new SmartNudgesService();