import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface ActivityItem {
  id: string;
  type: 'task' | 'goal' | 'message' | 'event' | 'shopping' | 'meal' | 'expense' | 'project' | 'checkin' | 'reminder';
  action: 'created' | 'updated' | 'completed' | 'deleted';
  title: string;
  user_name: string;
  user_id: string;
  user_avatar?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export const activityFeedService = {
  /**
   * Get recent activities for a space
   * Aggregates actions from multiple tables into a unified feed
   */
  async getRecentActivities(spaceId: string, limit: number = 10): Promise<ActivityItem[]> {
    const supabase = createClient();
    const activities: ActivityItem[] = [];

    try {
      // Fetch recent data from all relevant tables concurrently
      const [tasks, goals, messages, events, checkIns] = await Promise.all([
        supabase.from('tasks').select('id, title, status, created_by, created_at, updated_at, users!tasks_created_by_fkey(id, name, email, avatar_url)').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(5),
        supabase.from('goals').select('id, title, status, created_by, created_at, updated_at, users!goals_created_by_fkey(id, name, email, avatar_url)').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(5),
        supabase.from('messages').select('id, content, sender_id, created_at, users!messages_sender_id_fkey(id, name, email, avatar_url)').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(5),
        supabase.from('calendar_events').select('id, title, created_by, created_at, updated_at, users!calendar_events_created_by_fkey(id, name, email, avatar_url)').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(5),
        supabase.from('daily_check_ins').select('id, mood, created_at, user_id, users(id, name, email, avatar_url)').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(5),
      ]);

      // Process tasks
      if (tasks.data) {
        tasks.data.forEach((task: any) => {
          const user = task.users as any;
          activities.push({
            id: `task-${task.id}`,
            type: 'task',
            action: task.status === 'completed' ? 'completed' : 'created',
            title: task.title,
            user_name: user?.name || user?.email || 'Unknown',
            user_id: task.created_by,
            user_avatar: user?.avatar_url,
            created_at: task.status === 'completed' ? task.updated_at : task.created_at,
          });
        });
      }

      // Process goals
      if (goals.data) {
        goals.data.forEach((goal: any) => {
          const user = goal.users as any;
          activities.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            action: goal.status === 'completed' ? 'completed' : 'created',
            title: goal.title,
            user_name: user?.name || user?.email || 'Unknown',
            user_id: goal.created_by,
            user_avatar: user?.avatar_url,
            created_at: goal.status === 'completed' ? goal.updated_at : goal.created_at,
          });
        });
      }

      // Process messages
      if (messages.data) {
        messages.data.forEach((message: any) => {
          const user = message.users as any;
          activities.push({
            id: `message-${message.id}`,
            type: 'message',
            action: 'created',
            title: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
            user_name: user?.name || user?.email || 'Unknown',
            user_id: message.sender_id,
            user_avatar: user?.avatar_url,
            created_at: message.created_at,
          });
        });
      }

      // Process events
      if (events.data) {
        events.data.forEach((event: any) => {
          const user = event.users as any;
          activities.push({
            id: `event-${event.id}`,
            type: 'event',
            action: 'created',
            title: event.title,
            user_name: user?.name || user?.email || 'Unknown',
            user_id: event.created_by,
            user_avatar: user?.avatar_url,
            created_at: event.created_at,
          });
        });
      }

      // Process check-ins
      if (checkIns.data) {
        checkIns.data.forEach((checkIn: any) => {
          const user = checkIn.users as any;
          const moodEmojis: Record<string, string> = {
            great: '😊', good: '🙂', okay: '😐', meh: '😕', rough: '😩'
          };
          activities.push({
            id: `checkin-${checkIn.id}`,
            type: 'checkin',
            action: 'created',
            title: `Checked in feeling ${checkIn.mood} ${moodEmojis[checkIn.mood] || ''}`,
            user_name: user?.name || user?.email || 'Unknown',
            user_id: checkIn.user_id,
            user_avatar: user?.avatar_url,
            created_at: checkIn.created_at,
          });
        });
      }

      // Sort all activities by created_at (most recent first)
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Return only the requested number of activities
      return activities.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return [];
    }
  },

  /**
   * Subscribe to real-time activity updates
   * Monitors multiple tables for changes
   */
  subscribeToActivities(
    spaceId: string,
    callback: () => void
  ): RealtimeChannel[] {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    // Tables to monitor for activity
    const tables = ['tasks', 'goals', 'messages', 'calendar_events', 'daily_check_ins', 'shopping_lists', 'meals', 'expenses', 'projects'];

    tables.forEach(table => {
      const channel = supabase
        .channel(`activity_${table}:${spaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `space_id=eq.${spaceId}`,
          },
          callback
        )
        .subscribe();

      channels.push(channel);
    });

    return channels;
  },
};
