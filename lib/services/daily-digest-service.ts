import { createClient } from '@/lib/supabase/server';
import { geminiService, DigestData, BatchDigestRequest } from './gemini-service';
import { emailService } from './email-service';

export interface DigestPreferences {
  id: string;
  user_id: string;
  digest_enabled: boolean;
  digest_time: string; // HH:MM:SS format
  timezone: string;
  created_at: string;
  updated_at: string;
}

/**
 * Daily digest service for collecting user data and generating digest emails
 */
export const dailyDigestService = {
  /**
   * Get all users who have digest enabled
   */
  async getUsersWithDigestEnabled(): Promise<Array<{ userId: string; email: string; name: string; timezone: string }>> {
    const supabase = createClient();

    // Use the new simplified digest view
    const { data: users, error } = await supabase
      .from('digest_enabled_users')
      .select('*');

    if (error) {
      console.error('Error fetching users with digest enabled:', error);

      // Fallback to direct table query if view doesn't exist yet
      const { data: fallbackUsers, error: fallbackError } = await supabase
        .from('user_notification_preferences')
        .select(`
          user_id,
          timezone
        `)
        .eq('digest_enabled', true);

      if (fallbackError) {
        console.error('Error with fallback query:', fallbackError);
        return [];
      }

      // Get user emails separately
      const userIds = fallbackUsers.map(u => u.user_id);
      const { data: userEmails } = await supabase
        .rpc('get_user_emails', { user_ids: userIds });

      return fallbackUsers.map(user => ({
        userId: user.user_id,
        email: userEmails?.find(u => u.id === user.user_id)?.email || '',
        name: userEmails?.find(u => u.id === user.user_id)?.name || 'User',
        timezone: user.timezone || 'America/New_York'
      }));
    }

    return users.map(user => ({
      userId: user.user_id,
      email: user.email || '',
      name: user.user_name || user.full_name || 'User',
      timezone: user.timezone || 'America/New_York'
    }));
  },

  /**
   * Collect all data for a user's daily digest
   */
  async collectUserDayData(userId: string, targetDate: string = new Date().toISOString().split('T')[0]): Promise<DigestData | null> {
    const supabase = createClient();

    try {
      // Get user info
      const { data: userInfo, error: userError } = await supabase
        .from('auth.users')
        .select('email, raw_user_meta_data')
        .eq('id', userId)
        .single();

      if (userError || !userInfo) {
        console.error('Error fetching user info:', userError);
        return null;
      }

      const userName = userInfo.raw_user_meta_data?.name ||
                      userInfo.raw_user_meta_data?.full_name ||
                      'User';

      // Get user's current space (assuming they have one active space)
      const { data: spaceData } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      const spaceId = spaceData?.space_id;

      // Parallel data collection for efficiency
      const [tasksData, eventsData, shoppingData, mealsData] = await Promise.all([
        this.getTodayTasks(userId, spaceId, targetDate),
        this.getTodayEvents(userId, spaceId, targetDate),
        this.getTodayShoppingLists(userId, spaceId),
        this.getTodayMeals(userId, spaceId, targetDate)
      ]);

      // Get overdue items
      const overdueData = await this.getOverdueItems(userId, spaceId, targetDate);

      return {
        userId,
        userName,
        userEmail: userInfo.email,
        timezone: 'UTC', // Will be updated from preferences
        tasks: tasksData,
        events: eventsData,
        shopping: shoppingData,
        meals: mealsData,
        overdue: overdueData
      };
    } catch (error) {
      console.error('Error collecting user day data:', error);
      return null;
    }
  },

  /**
   * Get tasks due today
   */
  async getTodayTasks(userId: string, spaceId: string | null, targetDate: string) {
    if (!spaceId) return [];

    const supabase = createClient();

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, priority, completed')
      .eq('space_id', spaceId)
      .eq('completed', false)
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .gte('due_date', `${targetDate}T00:00:00.000Z`)
      .lt('due_date', `${targetDate}T23:59:59.999Z`)
      .order('due_date', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error fetching today tasks:', error);
      return [];
    }

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.priority as 'low' | 'normal' | 'high' | 'urgent',
      is_overdue: false
    }));
  },

  /**
   * Get events happening today
   */
  async getTodayEvents(userId: string, spaceId: string | null, targetDate: string) {
    if (!spaceId) return [];

    const supabase = createClient();

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, title, description, start_time, end_time, location')
      .eq('space_id', spaceId)
      .gte('start_time', `${targetDate}T00:00:00.000Z`)
      .lt('start_time', `${targetDate}T23:59:59.999Z`)
      .order('start_time', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching today events:', error);
      return [];
    }

    return events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location
    }));
  },

  /**
   * Get shopping lists that need attention
   */
  async getTodayShoppingLists(userId: string, spaceId: string | null) {
    if (!spaceId) return [];

    const supabase = createClient();

    // Get shopping lists with pending items
    const { data: lists, error } = await supabase
      .from('shopping_lists')
      .select(`
        id,
        name,
        shopping_list_items!inner(
          id,
          checked
        )
      `)
      .eq('space_id', spaceId)
      .eq('shopping_list_items.checked', false)
      .limit(5);

    if (error) {
      console.error('Error fetching shopping lists:', error);
      return [];
    }

    return lists.map(list => ({
      id: list.id,
      name: list.name,
      items_count: list.shopping_list_items.length,
      pending_items: list.shopping_list_items.filter(item => !item.checked).length
    }));
  },

  /**
   * Get meals planned for today
   */
  async getTodayMeals(userId: string, spaceId: string | null, targetDate: string) {
    if (!spaceId) return [];

    const supabase = createClient();

    const { data: meals, error } = await supabase
      .from('meal_plans')
      .select('id, name, meal_type, prep_time, cook_time')
      .eq('space_id', spaceId)
      .gte('scheduled_date', `${targetDate}T00:00:00.000Z`)
      .lt('scheduled_date', `${targetDate}T23:59:59.999Z`)
      .order('scheduled_date', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching today meals:', error);
      return [];
    }

    return meals.map(meal => ({
      id: meal.id,
      name: meal.name,
      meal_type: meal.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      prep_time: meal.prep_time,
      cook_time: meal.cook_time
    }));
  },

  /**
   * Get overdue items from previous days
   */
  async getOverdueItems(userId: string, spaceId: string | null, targetDate: string) {
    if (!spaceId) return [];

    const supabase = createClient();

    // Get overdue tasks
    const { data: overdueTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, due_date')
      .eq('space_id', spaceId)
      .eq('completed', false)
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .lt('due_date', `${targetDate}T00:00:00.000Z`)
      .order('due_date', { ascending: false })
      .limit(5);

    if (tasksError) {
      console.error('Error fetching overdue tasks:', tasksError);
      return [];
    }

    const overdue = overdueTasks.map(task => {
      const dueDate = new Date(task.due_date);
      const currentDate = new Date(targetDate);
      const daysOverdue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: task.id,
        title: task.title,
        type: 'task' as const,
        days_overdue: daysOverdue
      };
    });

    return overdue;
  },

  /**
   * Generate and send daily digests for all users
   */
  async generateAndSendDailyDigests(): Promise<{ sent: number; failed: number; errors: string[] }> {
    try {
      console.log('Starting daily digest generation...');

      // Get all users with digest enabled
      const users = await this.getUsersWithDigestEnabled();
      console.log(`Found ${users.length} users with digest enabled`);

      if (users.length === 0) {
        return { sent: 0, failed: 0, errors: [] };
      }

      // Collect data for all users in parallel
      const userDataPromises = users.map(async (user) => {
        const data = await this.collectUserDayData(user.userId);
        if (data) {
          data.userEmail = user.email;
          data.userName = user.name;
          data.timezone = user.timezone;
        }
        return data;
      });

      const userDataResults = await Promise.all(userDataPromises);
      const validUserData = userDataResults.filter(data => data !== null) as DigestData[];

      console.log(`Collected data for ${validUserData.length} users`);

      if (validUserData.length === 0) {
        return { sent: 0, failed: 0, errors: ['No valid user data collected'] };
      }

      // Generate digests using Gemini batch processing
      console.log('Generating digests with Gemini...');
      const batchRequest: BatchDigestRequest = { users: validUserData };
      const digestResults = await geminiService.generateBatchDigests(batchRequest);

      console.log(`Generated ${digestResults.digests.length} digests`);

      // Send emails in batches
      const emailResults = await this.sendDigestEmails(digestResults.digests);

      console.log(`Email results: ${emailResults.sent} sent, ${emailResults.failed} failed`);

      return emailResults;
    } catch (error) {
      console.error('Error in generateAndSendDailyDigests:', error);
      return {
        sent: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  },

  /**
   * Send digest emails in bulk
   */
  async sendDigestEmails(digests: Array<{ userId: string; email: any }>): Promise<{ sent: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    // Process in batches of 50 to respect rate limits
    const batchSize = 50;

    for (let i = 0; i < digests.length; i += batchSize) {
      const batch = digests.slice(i, i + batchSize);

      const batchPromises = batch.map(async ({ userId, email }) => {
        try {
          // Get user email from our user data
          const supabase = createClient();
          const { data: userData } = await supabase
            .from('auth.users')
            .select('email')
            .eq('id', userId)
            .single();

          if (!userData?.email) {
            throw new Error(`No email found for user ${userId}`);
          }

          // Send email using Resend via our email service
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);

          const { data: emailResult, error: emailError } = await resend.emails.send({
            from: 'Rowan Daily Digest <digest@rowanapp.com>',
            to: [userData.email],
            subject: email.subject,
            html: email.htmlContent,
            text: email.textContent,
          });

          if (emailError) {
            throw emailError;
          }

          console.log(`Digest sent to ${userData.email} (${userId})`);
          return { success: true, userId };
        } catch (error) {
          const errorMessage = `Failed to send digest to ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMessage);
          errors.push(errorMessage);
          return { success: false, userId };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          sent++;
        } else {
          failed++;
        }
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < digests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { sent, failed, errors };
  },

  /**
   * Get or create digest preferences for a user
   */
  async getDigestPreferences(userId: string): Promise<DigestPreferences | null> {
    try {
      // Use the new digest preferences API
      const response = await fetch('/api/digest/preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        return {
          id: result.data.id,
          user_id: result.data.user_id,
          digest_enabled: result.data.digest_enabled ?? true,
          digest_time: result.data.digest_time ?? '07:00:00',
          timezone: result.data.timezone ?? 'America/New_York',
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching digest preferences via API:', error);

      // Fallback to direct database query
      const supabase = createClient();
      const { data: prefs, error: dbError } = await supabase
        .from('user_notification_preferences')
        .select('id, user_id, digest_enabled, digest_time, timezone, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (dbError) {
        console.error('Error with fallback database query:', dbError);
        return null;
      }

      return {
        id: prefs.id,
        user_id: prefs.user_id,
        digest_enabled: prefs.digest_enabled ?? true,
        digest_time: prefs.digest_time ?? '07:00:00',
        timezone: prefs.timezone ?? 'America/New_York',
        created_at: prefs.created_at,
        updated_at: prefs.updated_at
      };
    }
  },

  /**
   * Update digest preferences for a user
   */
  async updateDigestPreferences(userId: string, updates: Partial<Pick<DigestPreferences, 'digest_enabled' | 'digest_time' | 'timezone'>>): Promise<DigestPreferences | null> {
    try {
      // Use the new digest preferences API
      const response = await fetch('/api/digest/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        return {
          id: result.data.id,
          user_id: result.data.user_id,
          digest_enabled: result.data.digest_enabled,
          digest_time: result.data.digest_time,
          timezone: result.data.timezone,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
      }

      return null;
    } catch (error) {
      console.error('Error updating digest preferences via API:', error);

      // Fallback to direct database query
      const supabase = createClient();
      const { data: updatedPrefs, error: dbError } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error with fallback database update:', dbError);
        return null;
      }

      return {
        id: updatedPrefs.id,
        user_id: updatedPrefs.user_id,
        digest_enabled: updatedPrefs.digest_enabled,
        digest_time: updatedPrefs.digest_time,
        timezone: updatedPrefs.timezone,
        created_at: updatedPrefs.created_at,
        updated_at: updatedPrefs.updated_at
      };
    }
  }
};