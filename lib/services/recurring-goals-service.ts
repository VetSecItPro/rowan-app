import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// =============================================
// TYPES & VALIDATION
// =============================================

export interface RecurringGoalTemplate {
  id: string;
  space_id: string;
  created_by: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  target_type: 'completion' | 'number' | 'duration' | 'distance' | 'custom';
  target_value: number;
  target_unit: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrence_pattern: RecurrencePattern;
  start_date: string;
  end_date?: string;
  is_habit: boolean;
  habit_category?: string;
  ideal_streak_length: number;
  allow_partial_completion: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurrencePattern {
  interval?: number; // For daily: every N days
  days_of_week?: number[]; // For weekly: 0=Sunday, 6=Saturday
  day_of_month?: number; // For monthly: day of month
  custom_rules?: Record<string, unknown>; // For custom patterns
}

export interface RecurringGoalInstance {
  id: string;
  template_id: string;
  goal_id?: string;
  period_start: string;
  period_end: string;
  target_value: number;
  current_value: number;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'failed';
  completion_percentage: number;
  completed_at?: string;
  auto_generated: boolean;
  generation_date: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  template?: RecurringGoalTemplate;
  goal?: Record<string, unknown>; // Reference to actual goal if created
}

export interface HabitEntry {
  id: string;
  template_id: string;
  user_id: string;
  entry_date: string;
  completed: boolean;
  completion_value: number;
  notes?: string;
  mood?: 'great' | 'okay' | 'struggling';
  completed_at?: string;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  // Populated relations
  template?: RecurringGoalTemplate;
}

export interface HabitStreak {
  id: string;
  template_id: string;
  user_id: string;
  streak_type: 'current' | 'longest' | 'weekly' | 'monthly';
  streak_count: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitAnalytics {
  id: string;
  template_id: string;
  user_id: string;
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  total_days: number;
  completed_days: number;
  completion_rate: number;
  average_value: number;
  total_value: number;
  best_streak: number;
  current_streak: number;
  trend_direction?: 'improving' | 'declining' | 'stable';
  trend_percentage: number;
  created_at: string;
  updated_at: string;
}

// Zod schemas for validation
const RecurrencePatternSchema = z.object({
  interval: z.number().optional(),
  days_of_week: z.array(z.number().min(0).max(6)).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  custom_rules: z.record(z.string(), z.unknown()).optional(),
});

const CreateRecurringGoalTemplateSchema = z.object({
  space_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().default('general'),
  tags: z.array(z.string()).default([]),
  target_type: z.enum(['completion', 'number', 'duration', 'distance', 'custom']).default('completion'),
  target_value: z.number().positive().default(1),
  target_unit: z.string().default('times'),
  recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  recurrence_pattern: RecurrencePatternSchema,
  start_date: z.string(),
  end_date: z.string().optional(),
  is_habit: z.boolean().default(false),
  habit_category: z.string().optional(),
  ideal_streak_length: z.number().positive().default(30),
  allow_partial_completion: z.boolean().default(false),
});

const CreateHabitEntrySchema = z.object({
  template_id: z.string().uuid(),
  entry_date: z.string(),
  completed: z.boolean().default(false),
  completion_value: z.number().default(0),
  notes: z.string().optional(),
  mood: z.enum(['great', 'okay', 'struggling']).optional(),
});

const UpdateHabitEntrySchema = z.object({
  completed: z.boolean().optional(),
  completion_value: z.number().optional(),
  notes: z.string().optional(),
  mood: z.enum(['great', 'okay', 'struggling']).optional(),
});

export type CreateRecurringGoalTemplateInput = z.infer<typeof CreateRecurringGoalTemplateSchema>;
export type CreateHabitEntryInput = z.infer<typeof CreateHabitEntrySchema>;
export type UpdateHabitEntryInput = z.infer<typeof UpdateHabitEntrySchema>;

// =============================================
// SERVICE
// =============================================

/** Service for managing recurring goal templates and auto-generating goal instances. */
export const recurringGoalsService = {
  // ===== RECURRING GOAL TEMPLATES =====

  /**
   * Get all recurring goal templates for a space
   */
  async getTemplates(spaceId: string): Promise<RecurringGoalTemplate[]> {
    // Return empty array for invalid spaceIds
    if (!spaceId) {
      return [];
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('recurring_goal_templates')
      .select('id, space_id, created_by, title, description, category, tags, target_type, target_value, target_unit, recurrence_type, recurrence_pattern, start_date, end_date, is_habit, habit_category, ideal_streak_length, allow_partial_completion, is_active, created_at, updated_at')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching recurring goal templates:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to fetch recurring goal templates');
    }

    return data || [];
  },

  /**
   * Get habit templates (recurring goals marked as habits)
   */
  async getHabitTemplates(spaceId: string): Promise<RecurringGoalTemplate[]> {
    // Return empty array for invalid spaceIds
    if (!spaceId) {
      return [];
    }

    const supabase = createClient();

    // Fallback habit templates for when database is unavailable
    const fallbackHabitTemplates: RecurringGoalTemplate[] = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        space_id: spaceId,
        created_by: '00000000-0000-4000-8000-000000000000',
        title: 'Morning Exercise',
        description: 'Start each day with 30 minutes of exercise',
        category: 'health',
        tags: ['fitness', 'morning', 'wellness'],
        target_type: 'duration',
        target_value: 30,
        target_unit: 'minutes',
        recurrence_type: 'daily',
        recurrence_pattern: { interval: 1 },
        start_date: new Date().toISOString(),
        is_habit: true,
        habit_category: 'health',
        ideal_streak_length: 30,
        allow_partial_completion: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        space_id: spaceId,
        created_by: '00000000-0000-4000-8000-000000000000',
        title: 'Daily Water Intake',
        description: 'Drink 8 glasses of water throughout the day',
        category: 'health',
        tags: ['hydration', 'wellness'],
        target_type: 'number',
        target_value: 8,
        target_unit: 'glasses',
        recurrence_type: 'daily',
        recurrence_pattern: { interval: 1 },
        start_date: new Date().toISOString(),
        is_habit: true,
        habit_category: 'health',
        ideal_streak_length: 21,
        allow_partial_completion: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        space_id: spaceId,
        created_by: '00000000-0000-4000-8000-000000000000',
        title: 'Read Daily',
        description: 'Read for at least 20 minutes each day',
        category: 'personal',
        tags: ['reading', 'learning', 'growth'],
        target_type: 'duration',
        target_value: 20,
        target_unit: 'minutes',
        recurrence_type: 'daily',
        recurrence_pattern: { interval: 1 },
        start_date: new Date().toISOString(),
        is_habit: true,
        habit_category: 'personal',
        ideal_streak_length: 30,
        allow_partial_completion: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    try {
      const { data, error } = await supabase
        .from('recurring_goal_templates')
        .select('id, space_id, created_by, title, description, category, tags, target_type, target_value, target_unit, recurrence_type, recurrence_pattern, start_date, end_date, is_habit, habit_category, ideal_streak_length, allow_partial_completion, is_active, created_at, updated_at')
        .eq('space_id', spaceId)
        .eq('is_habit', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching habit templates, using fallback data:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
        return fallbackHabitTemplates;
      }

      return data || fallbackHabitTemplates;
    } catch (error) {
      logger.error('Database connection failed for habit templates, using fallback data:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      return fallbackHabitTemplates;
    }
  },

  /**
   * Create a new recurring goal template
   */
  async createTemplate(input: CreateRecurringGoalTemplateInput): Promise<RecurringGoalTemplate> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Validate input
    const validated = CreateRecurringGoalTemplateSchema.parse(input);

    const { data, error } = await supabase
      .from('recurring_goal_templates')
      .insert({
        ...validated,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating recurring goal template:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to create recurring goal template');
    }

    // Generate initial instances if it's a habit
    if (validated.is_habit) {
      try {
        await this.generateInstances(data.id);
      } catch (error) {
        logger.error('Error generating initial instances:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
        // Don't fail the creation, just log the error
      }
    }

    return data;
  },

  /**
   * Update a recurring goal template
   */
  async updateTemplate(id: string, updates: Partial<CreateRecurringGoalTemplateInput>): Promise<RecurringGoalTemplate> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('recurring_goal_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating recurring goal template:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to update recurring goal template');
    }

    return data;
  },

  /**
   * Delete a recurring goal template
   */
  async deleteTemplate(id: string): Promise<void> {
    const supabase = createClient();

    // Soft delete by setting inactive
    const { error } = await supabase
      .from('recurring_goal_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('Error deleting recurring goal template:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to delete recurring goal template');
    }
  },

  // ===== RECURRING GOAL INSTANCES =====

  /**
   * Generate instances for a template
   */
  async generateInstances(templateId: string, untilDate?: string): Promise<number> {
    const supabase = createClient();

    const until = untilDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

    const { data, error } = await supabase
      .rpc('generate_recurring_instances', {
        template_id_param: templateId,
        until_date: until,
      });

    if (error) {
      logger.error('Error generating instances:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to generate instances');
    }

    return data || 0;
  },

  /**
   * Get instances for a template
   */
  async getInstances(templateId: string, startDate?: string, endDate?: string): Promise<RecurringGoalInstance[]> {
    const supabase = createClient();

    let query = supabase
      .from('recurring_goal_instances')
      .select(`
        id, template_id, goal_id, period_start, period_end, target_value, current_value, status, completion_percentage, completed_at, auto_generated, generation_date, created_at, updated_at,
        template:recurring_goal_templates(*)
      `)
      .eq('template_id', templateId)
      .order('period_start', { ascending: true });

    if (startDate) {
      query = query.gte('period_start', startDate);
    }

    if (endDate) {
      query = query.lte('period_start', endDate);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching instances:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to fetch instances');
    }

    return data || [];
  },

  /**
   * Update instance status
   */
  async updateInstance(id: string, updates: {
    status?: RecurringGoalInstance['status'];
    current_value?: number;
    completion_percentage?: number;
  }): Promise<RecurringGoalInstance> {
    const supabase = createClient();

    const updateData: {
      status?: RecurringGoalInstance['status'];
      current_value?: number;
      completion_percentage?: number;
      updated_at: string;
      completed_at?: string | null;
    } = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at if status is completed
    if (updates.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('recurring_goal_instances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating instance:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to update instance');
    }

    return data;
  },

  // ===== HABIT ENTRIES =====

  /**
   * Get habit entries for a date range
   */
  async getHabitEntries(templateId: string, startDate?: string, endDate?: string): Promise<HabitEntry[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Check if this is a fallback template ID (starts with 00000000-)
    if (templateId.startsWith('00000000-')) {
      // Return empty array for fallback templates
      return [];
    }

    let query = supabase
      .from('habit_entries')
      .select(`
        id, template_id, user_id, entry_date, completed, completion_value, notes, mood, completed_at, reminder_sent, created_at, updated_at,
        template:recurring_goal_templates(*)
      `)
      .eq('template_id', templateId)
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (startDate) {
      query = query.gte('entry_date', startDate);
    }

    if (endDate) {
      query = query.lte('entry_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching habit entries:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to fetch habit entries');
    }

    return data || [];
  },

  /**
   * Create or update a habit entry (upsert)
   */
  async upsertHabitEntry(input: CreateHabitEntryInput): Promise<HabitEntry> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Check if this is a fallback template ID (starts with 00000000-)
    if (input.template_id.startsWith('00000000-')) {
      // For fallback templates, return a mock entry instead of trying to save to database
      const mockEntry: HabitEntry = {
        id: `entry-${Date.now()}`,
        template_id: input.template_id,
        user_id: user.id,
        entry_date: input.entry_date,
        completed: input.completed || false,
        completion_value: input.completion_value || 0,
        notes: input.notes,
        mood: input.mood,
        completed_at: input.completed ? new Date().toISOString() : undefined,
        reminder_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return mockEntry;
    }

    // Validate input
    const validated = CreateHabitEntrySchema.parse(input);

    const entryData = {
      ...validated,
      user_id: user.id,
      completed_at: validated.completed ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('habit_entries')
      .upsert(entryData, {
        onConflict: 'template_id, user_id, entry_date',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error upserting habit entry:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to save habit entry');
    }

    return data;
  },

  /**
   * Update a habit entry
   */
  async updateHabitEntry(id: string, updates: UpdateHabitEntryInput): Promise<HabitEntry> {
    const supabase = createClient();

    // Validate updates
    const validated = UpdateHabitEntrySchema.parse(updates);

    const updateData: UpdateHabitEntryInput & {
      updated_at: string;
      completed_at?: string | null;
    } = {
      ...validated,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at if marking as completed
    if (validated.completed === true) {
      updateData.completed_at = new Date().toISOString();
    } else if (validated.completed === false) {
      updateData.completed_at = null;
    }

    const { data, error } = await supabase
      .from('habit_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating habit entry:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to update habit entry');
    }

    return data;
  },

  // ===== HABIT STREAKS =====

  /**
   * Get streaks for a habit
   */
  async getHabitStreaks(templateId: string): Promise<HabitStreak[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Check if this is a fallback template ID (starts with 00000000-)
    if (templateId.startsWith('00000000-')) {
      // Return empty array for fallback templates
      return [];
    }

    const { data, error } = await supabase
      .from('habit_streaks')
      .select('id, template_id, user_id, streak_type, streak_count, start_date, end_date, is_active, created_at, updated_at')
      .eq('template_id', templateId)
      .eq('user_id', user.id)
      .order('streak_type', { ascending: true });

    if (error) {
      logger.error('Error fetching habit streaks:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to fetch habit streaks');
    }

    return data || [];
  },

  // ===== HABIT ANALYTICS =====

  /**
   * Get habit analytics for a period
   */
  async getHabitAnalytics(templateId: string, periodType: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<HabitAnalytics[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('habit_analytics')
      .select('id, template_id, user_id, period_type, period_start, period_end, total_days, completed_days, completion_rate, average_value, total_value, best_streak, current_streak, trend_direction, trend_percentage, created_at, updated_at')
      .eq('template_id', templateId)
      .eq('user_id', user.id)
      .eq('period_type', periodType)
      .order('period_start', { ascending: false })
      .limit(12); // Last 12 periods

    if (error) {
      logger.error('Error fetching habit analytics:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
      throw new Error('Failed to fetch habit analytics');
    }

    return data || [];
  },

  // ===== UTILITY FUNCTIONS =====

  /**
   * Get today's habit entries for all habits in a space
   */
  async getTodaysHabits(spaceId: string): Promise<{
    template: RecurringGoalTemplate;
    entry?: HabitEntry;
    streak?: HabitStreak;
  }[]> {
    try {
      // Return empty array for invalid spaceIds
      if (!spaceId) {
        return [];
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        logger.info('User not authenticated for habits, using fallback data', { component: 'lib-recurring-goals-service' });
        // Return fallback habits with basic template data
        const fallbackHabits = await this.getHabitTemplates(spaceId);
        return fallbackHabits.map(template => ({ template }));
      }

      const today = new Date().toISOString().split('T')[0];

      // Get all habit templates for the space
      const habits = await this.getHabitTemplates(spaceId);

      // Get today's entries and current streaks for all habits
      const results = await Promise.all(
        habits.map(async (template) => {
          try {
            const [entries, streaks] = await Promise.all([
              this.getHabitEntries(template.id, today, today),
              this.getHabitStreaks(template.id),
            ]);

            return {
              template,
              entry: entries[0],
              streak: streaks[0],
            };
          } catch (error) {
            logger.error('Error loading data for habit ${template.title}, using fallback:', error, { component: 'lib-recurring-goals-service', action: 'service_call' });
            // Return template with no entry/streak data on error
            return {
              template,
            };
          }
        })
      );

      return results;
    } catch (error) {
      logger.error('Error loading today\'s habits, using fallback data:', error, { component: 'recurring-goals-service', action: 'service_call' });
      // Get fallback habit templates and return them without entries/streaks
      const fallbackHabits = await this.getHabitTemplates(spaceId);
      return fallbackHabits.map(template => ({ template }));
    }
  },

  /**
   * Get habit entries and current streaks (legacy method kept for getTodaysHabits)
   */
  async _getTodaysHabitsLegacy(spaceId: string): Promise<{
    template: RecurringGoalTemplate;
    entry?: HabitEntry;
    streak?: HabitStreak;
  }[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const today = new Date().toISOString().split('T')[0];

    // Get all habit templates for the space
    const habits = await this.getHabitTemplates(spaceId);

    // Get today's entries and current streaks for all habits
    const results = await Promise.all(
      habits.map(async (template) => {
        const [entries, streaks] = await Promise.all([
          this.getHabitEntries(template.id, today, today),
          this.getHabitStreaks(template.id),
        ]);

        return {
          template,
          entry: entries[0] || undefined,
          streak: streaks.find(s => s.streak_type === 'current') || undefined,
        };
      })
    );

    return results;
  },

  /**
   * Generate habit calendar data for a month
   */
  async getHabitCalendar(templateId: string, year: number, month: number): Promise<{
    date: string;
    completed: boolean;
    value: number;
    mood?: string;
  }[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const entries = await this.getHabitEntries(templateId, startDate, endDate);

    // Generate full month data including days without entries
    const calendarData = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day).toISOString().split('T')[0];
      const entry = entries.find(e => e.entry_date === date);

      calendarData.push({
        date,
        completed: entry?.completed || false,
        value: entry?.completion_value || 0,
        mood: entry?.mood,
      });
    }

    return calendarData;
  },

  /**
   * Calculate completion rate for a habit over a period
   */
  async calculateCompletionRate(templateId: string, days: number = 30): Promise<{
    rate: number;
    completed: number;
    total: number;
    streak: number;
  }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Check if this is a fallback template ID (starts with 00000000-)
    if (templateId.startsWith('00000000-')) {
      // Return default stats for fallback templates
      return {
        rate: 0,
        completed: 0,
        total: days,
        streak: 0,
      };
    }

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const entries = await this.getHabitEntries(templateId, startDate, endDate);
    const streaks = await this.getHabitStreaks(templateId);

    const completedCount = entries.filter(e => e.completed).length;
    const rate = days > 0 ? (completedCount / days) * 100 : 0;
    const currentStreak = streaks.find(s => s.streak_type === 'current')?.streak_count || 0;

    return {
      rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
      completed: completedCount,
      total: days,
      streak: currentStreak,
    };
  },
};
