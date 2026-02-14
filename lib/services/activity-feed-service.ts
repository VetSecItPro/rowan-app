import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { cacheAside, cacheKeys, CACHE_TTL } from '@/lib/cache';

export interface ActivityItem {
  id: string;
  type: 'task' | 'goal' | 'message' | 'event' | 'shopping' | 'meal' | 'expense' | 'project' | 'checkin' | 'reminder';
  action: 'created' | 'updated' | 'completed' | 'deleted';
  title: string;
  user_name: string;
  user_id: string;
  user_avatar?: string;
  created_at: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/** Service for fetching and subscribing to real-time activity feeds across a space. */
export const activityFeedService = {
  /**
   * Get recent activities for a space
   * Uses optimized RPC that combines all tables in a single UNION ALL query
   * This replaces the previous 11 parallel queries pattern
   * Results are cached in Redis for 5 minutes
   */
  async getRecentActivities(spaceId: string, limit: number = 10): Promise<ActivityItem[]> {
    const cacheKey = cacheKeys.activityFeed(spaceId, limit);

    return cacheAside<ActivityItem[]>(
      cacheKey,
      async () => {
        const supabase = createClient();

        try {
          // Use single RPC call that combines all 11 tables with UNION ALL
          // This is much more efficient than 11 parallel queries
          const { data, error } = await supabase.rpc('get_unified_activity_feed', {
            p_space_id: spaceId,
            p_limit: limit,
          });

          if (error) {
            logger.error('Failed to fetch activities:', error, {
              component: 'lib-activity-feed-service',
              action: 'service_call',
            });
            return [];
          }

          if (!data || data.length === 0) {
            return [];
          }

          // Map RPC results to ActivityItem interface
          return data.map((item: {
            id: string;
            activity_type: string;
            action: string;
            title: string;
            user_name: string;
            user_id: string;
            user_avatar: string | null;
            created_at: string;
            metadata: Record<string, unknown> | null;
          }) => ({
            id: item.id,
            type: item.activity_type as ActivityItem['type'],
            action: item.action as ActivityItem['action'],
            title: item.title,
            user_name: item.user_name,
            user_id: item.user_id,
            user_avatar: item.user_avatar || undefined,
            created_at: item.created_at,
            metadata: item.metadata || undefined,
          }));
        } catch (error) {
          logger.error('Failed to fetch activities:', error, {
            component: 'lib-activity-feed-service',
            action: 'service_call',
          });
          return [];
        }
      },
      CACHE_TTL.MEDIUM // 5 minutes
    );
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
    const tables = ['tasks', 'goals', 'messages', 'calendar_events', 'daily_checkins', 'shopping_lists', 'meals', 'expenses', 'projects', 'reminders', 'chores'];

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
