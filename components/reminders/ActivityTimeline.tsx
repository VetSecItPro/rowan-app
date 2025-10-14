'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Edit,
  CheckCircle,
  Circle,
  Clock,
  Bell,
  UserCheck,
  UserX,
  Trash2,
  MessageSquare,
  RefreshCw,
  Flag,
  Tag,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ReminderActivity,
  reminderActivityService,
} from '@/lib/services/reminder-activity-service';

interface ActivityTimelineProps {
  reminderId: string;
  className?: string;
}

// Icon mapping
const iconComponents = {
  Plus,
  Edit,
  CheckCircle,
  Circle,
  Clock,
  Bell,
  UserCheck,
  UserX,
  Trash2,
  MessageSquare,
  RefreshCw,
  Flag,
  Tag,
  Activity,
};

export function ActivityTimeline({ reminderId, className = '' }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ReminderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const data = await reminderActivityService.getActivityLog(reminderId);
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activity log:', error);
      } finally {
        setLoading(false);
      }
    };

    if (reminderId) {
      fetchActivities();
    }
  }, [reminderId]);

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get icon component
  const getIconComponent = (iconName: string) => {
    return iconComponents[iconName as keyof typeof iconComponents] || Activity;
  };

  // Show only first 3 activities by default
  const displayedActivities = showAll ? activities : activities.slice(0, 3);
  const hasMore = activities.length > 3;

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Activity ({activities.length})
          </h3>
        </div>
        {!isExpanded && hasMore && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
          </button>
        )}
      </div>

      {/* Activity List */}
      {isExpanded ? (
        // Expanded View with Timeline
        <div className="space-y-4">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

            {/* Activities */}
            <div className="space-y-4">
              {displayedActivities.map((activity, index) => {
                const IconComponent = getIconComponent(
                  reminderActivityService.getActivityIcon(activity.action)
                );
                const iconColor = reminderActivityService.getActivityColor(activity.action);
                const message = reminderActivityService.formatActivityMessage(activity);

                return (
                  <div key={activity.id} className="relative flex items-start gap-4 pl-0">
                    {/* Icon Circle */}
                    <div
                      className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center ${iconColor}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* User Avatar */}
                          {activity.user && (
                            <div className="flex items-center gap-2 mb-1">
                              {activity.user.avatar_url ? (
                                <img
                                  src={activity.user.avatar_url}
                                  alt={activity.user.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                                  {getInitials(activity.user.name)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {activity.user.name}
                              </span>
                            </div>
                          )}

                          {/* Message */}
                          <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>

                          {/* Metadata */}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {activity.action === 'snoozed' && activity.metadata.snooze_until && (
                                <span>
                                  Until {new Date(activity.metadata.snooze_until).toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Show More/Less Button */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show {activities.length - 3} More
                </>
              )}
            </button>
          )}

          {/* Collapse Button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Collapse Activity
          </button>
        </div>
      ) : (
        // Compact View
        <div className="space-y-2">
          {activities.slice(0, 2).map((activity) => {
            const IconComponent = getIconComponent(
              reminderActivityService.getActivityIcon(activity.action)
            );
            const iconColor = reminderActivityService.getActivityColor(activity.action);
            const message = reminderActivityService.formatActivityMessage(activity);

            return (
              <div key={activity.id} className="flex items-start gap-2">
                {/* Icon */}
                <div className={`flex-shrink-0 ${iconColor} mt-0.5`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">{message}</p>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
