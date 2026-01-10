'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, CheckSquare, Target, MessageCircle, Calendar, ShoppingCart, UtensilsCrossed, DollarSign, Folder, Heart, Bell, ChevronRight, Clock } from 'lucide-react';
import { activityFeedService, type ActivityItem } from '@/lib/services/activity-feed-service';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface ActivityFeedProps {
  spaceId: string;
  limit?: number;
}

export function ActivityFeed({ spaceId, limit = 50 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadActivities();
  }, [spaceId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!spaceId) return;

    const supabase = createClient();
    const channels = activityFeedService.subscribeToActivities(spaceId, () => {
      loadActivities(); // Reload activities when any change occurs
    });

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [spaceId]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await activityFeedService.getRecentActivities(spaceId, limit);
      setActivities(data);
    } catch (error) {
      logger.error('Failed to load activities:', error, { component: 'ActivityFeed', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8 && displayCount < activities.length) {
      setDisplayCount(prev => Math.min(prev + 10, activities.length));
    }
  }, [displayCount, activities.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    const iconMap = {
      task: CheckSquare,
      goal: Target,
      message: MessageCircle,
      event: Calendar,
      shopping: ShoppingCart,
      meal: UtensilsCrossed,
      expense: DollarSign,
      project: Folder,
      checkin: Heart,
      reminder: Bell,
    };
    return iconMap[type] || Activity;
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    const colorMap = {
      task: 'from-blue-500 to-blue-600',
      goal: 'from-indigo-500 to-indigo-600',
      message: 'from-green-500 to-green-600',
      event: 'from-purple-500 to-purple-600',
      shopping: 'from-emerald-500 to-emerald-600',
      meal: 'from-orange-500 to-orange-600',
      expense: 'from-amber-500 to-amber-600',
      project: 'from-slate-500 to-slate-600',
      checkin: 'from-pink-500 to-pink-600',
      reminder: 'from-rose-500 to-rose-600',
    };
    return colorMap[type] || 'from-gray-500 to-gray-600';
  };

  const getActionLabel = (action: ActivityItem['action']) => {
    const labelMap = {
      created: 'created',
      updated: 'updated',
      completed: 'completed',
      deleted: 'deleted',
    };
    return labelMap[action];
  };

  const getActivityRoute = (type: ActivityItem['type']) => {
    const routeMap: Record<string, string> = {
      task: '/tasks',
      goal: '/goals',
      message: '/messages',
      event: '/calendar',
      shopping: '/shopping',
      meal: '/meals',
      expense: '/projects',
      project: '/projects',
      checkin: '/dashboard',
      reminder: '/reminders',
    };
    return routeMap[type] || '/dashboard';
  };

  const displayedActivities = activities.slice(0, displayCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          No recent activity yet
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
          Activity from your space will appear here
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="space-y-2 max-h-[500px] overflow-y-scroll pr-2"
      style={{
        scrollbarWidth: 'auto',
        scrollbarColor: '#9ca3af #e5e7eb'
      }}
    >
      {/* Activity Items */}
      {displayedActivities.map((activity, index) => {
        const Icon = getActivityIcon(activity.type);
        const gradient = getActivityColor(activity.type);
        const route = getActivityRoute(activity.type);

        return (
          <Link
            key={activity.id}
            href={route}
            className="block group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 border border-white/20 dark:border-gray-700/30 hover:border-indigo-500/30 dark:hover:border-indigo-400/30 transition-all duration-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] group-hover:translate-x-1">
              {/* Icon */}
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                <Icon className="w-4 h-4 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* User Avatar */}
                    {activity.user_avatar ? (
                      <img
                        src={activity.user_avatar}
                        alt={activity.user_name}
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-semibold text-white">
                          {activity.user_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {activity.user_name}
                    </span>
                  </div>
                  {/* Time */}
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px]">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Action and Title */}
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  <span className="text-gray-500 dark:text-gray-400">{getActionLabel(activity.action)}</span>
                  {' '}
                  <span className="font-medium">{activity.title}</span>
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
            </div>
          </Link>
        );
      })}

      {/* Loading indicator for infinite scroll */}
      {displayCount < activities.length && (
        <div className="flex items-center justify-center py-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Scroll for more · {displayCount} of {activities.length}
          </div>
        </div>
      )}

      {/* End of list indicator */}
      {displayCount >= activities.length && activities.length > 10 && (
        <div className="flex items-center justify-center py-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            All activities loaded · {activities.length} total
          </div>
        </div>
      )}
    </div>
  );
}
