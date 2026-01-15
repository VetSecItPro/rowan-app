'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import {
  getActivityFeed,
  getActivityStats,
  type ActivityLog,
  type ActivityType,
} from '@/lib/services/comments-service';

interface ActivityFeedProps {
  spaceId: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  showStats?: boolean;
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  created: '✨',
  updated: '✏️',
  deleted: '🗑️',
  completed: '✅',
  commented: '💬',
  mentioned: '@',
  reacted: '❤️',
  shared: '🔗',
  assigned: '👤',
  status_changed: '🔄',
  amount_changed: '💰',
  date_changed: '📅',
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  created: 'text-green-600 text-green-400 bg-green-900/20',
  updated: 'text-blue-600 text-blue-400 bg-blue-900/20',
  deleted: 'text-red-600 text-red-400 bg-red-900/20',
  completed: 'text-green-600 text-green-400 bg-green-900/20',
  commented: 'text-purple-600 text-purple-400 bg-purple-900/20',
  mentioned: 'text-amber-600 text-amber-400 bg-amber-900/20',
  reacted: 'text-pink-600 text-pink-400 bg-pink-900/20',
  shared: 'text-indigo-600 text-indigo-400 bg-indigo-900/20',
  assigned: 'text-cyan-600 text-cyan-400 bg-cyan-900/20',
  status_changed: 'text-blue-600 text-blue-400 bg-blue-900/20',
  amount_changed: 'text-emerald-600 text-emerald-400 bg-emerald-900/20',
  date_changed: 'text-violet-600 text-violet-400 bg-violet-900/20',
};

export default function ActivityFeed({
  spaceId,
  entityType,
  entityId,
  limit = 20,
  showStats = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load activity feed
  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await getActivityFeed(spaceId, limit);
      setActivities(data);
      setError(null);
    } catch (err) {
      logger.error('Failed to load activity feed:', err, { component: 'ActivityFeed', action: 'component_action' });
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  // Load stats if requested
  const loadStats = async () => {
    if (!showStats) return;

    try {
      const data = await getActivityStats(spaceId);
      setStats(data);
    } catch (err) {
      logger.error('Failed to load activity stats:', err, { component: 'ActivityFeed', action: 'component_action' });
    }
  };

  useEffect(() => {
    loadActivities();
    loadStats();
  }, [spaceId, entityType, entityId, limit]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`activity:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          loadActivities();
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 bg-red-900/20">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Section */}
      {showStats && stats && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 bg-gray-800">
          <h3 className="mb-3 text-sm font-medium text-gray-100">
            Activity Stats (Last 30 Days)
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-2xl font-bold text-gray-100">
                {stats.total_activities}
              </p>
              <p className="text-xs text-gray-400">Total Activities</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {stats.by_type?.commented || 0}
              </p>
              <p className="text-xs text-gray-400">Comments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">
                {stats.by_type?.updated || 0}
              </p>
              <p className="text-xs text-gray-400">Updates</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {stats.top_contributors?.length || 0}
              </p>
              <p className="text-xs text-gray-400">Contributors</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="space-y-2">
        {activities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 border-gray-700 bg-gray-800/50">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-400">
              No activity yet
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-shadow border-gray-700 bg-gray-800"
            >
              {/* Activity Icon */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  ACTIVITY_COLORS[activity.activity_type]
                }`}
              >
                <span className="text-sm">
                  {ACTIVITY_ICONS[activity.activity_type] || '📝'}
                </span>
              </div>

              {/* Activity Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-100">
                      <span className="font-medium">
                        {activity.user_email?.split('@')[0] || 'Unknown'}
                      </span>{' '}
                      <span className="text-gray-400">
                        {activity.description}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {activity.entity_type.replace('_', ' ')} •{' '}
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* System Badge */}
                  {activity.is_system && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs bg-gray-700 text-gray-400">
                      System
                    </span>
                  )}
                </div>

                {/* Metadata */}
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 rounded bg-gray-50 p-2 bg-gray-700/50">
                    <p className="text-xs text-gray-400">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {activities.length >= limit && (
        <div className="text-center">
          <button
            onClick={loadActivities}
            className="text-sm text-blue-600 text-blue-400 hover:text-blue-300"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
