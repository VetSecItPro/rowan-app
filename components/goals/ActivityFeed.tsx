'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Users, Calendar, CheckCircle2, Target, Mic } from 'lucide-react';
import { GoalActivity, GoalComment } from '@/lib/services/goals-service';
import { createClient } from '@/lib/supabase/client';
import { hapticLight, hapticSuccess } from '@/lib/utils/haptics';
import { logger } from '@/lib/logger';

interface ActivityFeedProps {
  spaceId: string;
  goalId?: string; // If provided, filter activities for specific goal
  className?: string;
}

type ActivityData = Partial<{
  goal_title: string;
  progress_percentage: number;
  mood: string;
  has_voice_note: boolean;
  has_notes: boolean;
  need_help: boolean;
}>;

type AuthUser = {
  email?: string | null;
  name?: string | null;
  user_metadata?: {
    name?: string | null;
  };
};

const activityIcons = {
  goal_created: Target,
  goal_updated: Target,
  goal_completed: CheckCircle2,
  goal_deleted: Target,
  milestone_created: Calendar,
  milestone_completed: CheckCircle2,
  milestone_updated: Calendar,
  milestone_deleted: Calendar,
  check_in_created: Calendar,
  check_in_updated: Calendar,
  goal_shared: Users,
  goal_collaborated: Users,
  goal_commented: MessageCircle,
};

const activityColors = {
  goal_created: 'text-green-500',
  goal_updated: 'text-blue-500',
  goal_completed: 'text-emerald-500',
  goal_deleted: 'text-red-500',
  milestone_created: 'text-purple-500',
  milestone_completed: 'text-emerald-500',
  milestone_updated: 'text-purple-500',
  milestone_deleted: 'text-red-500',
  check_in_created: 'text-indigo-500',
  check_in_updated: 'text-indigo-500',
  goal_shared: 'text-orange-500',
  goal_collaborated: 'text-orange-500',
  goal_commented: 'text-gray-400',
};

const emojiReactions = ['👍', '❤️', '🎉', '🔥', '💪', '👏', '🚀', '✨'];

/** Displays a chronological feed of goal-related activities and check-ins. */
export function ActivityFeed({ spaceId, goalId, className = '' }: ActivityFeedProps) {
  const [activities, setActivities] = useState<GoalActivity[]>([]);
  const [comments, setComments] = useState<Record<string, GoalComment[]>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase]);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);

      // Return empty activities for invalid spaceIds
      if (!spaceId) {
        setActivities([]);
        return;
      }

      let query = supabase
        .from('goal_activities')
        .select(`
          *,
          users!goal_activities_user_id_fkey(id, email, name, avatar_url),
          goals!goal_activities_goal_id_fkey(id, title),
          goal_milestones!goal_activities_milestone_id_fkey(id, title),
          goal_check_ins!goal_activities_check_in_id_fkey(id, progress_percentage, mood)
        `)
        .eq('space_id', spaceId);

      if (goalId) {
        query = query.eq('goal_id', goalId);
      }

      const { data: activitiesData, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(activitiesData || []);
    } catch (error) {
      logger.error('Error loading activities:', error, { component: 'ActivityFeed', action: 'component_action' });
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [goalId, spaceId, supabase]);

  useEffect(() => {
    loadUser();
    loadActivities();
  }, [loadUser, loadActivities]);

  const loadComments = async (activityId: string) => {
    if (comments[activityId]) return; // Already loaded

    try {
      const { data: commentsData, error } = await supabase
        .from('goal_comments')
        .select(`
          *,
          users!goal_comments_user_id_fkey(id, email, name, avatar_url)
        `)
        .eq('goal_id', activityId) // This might need adjustment based on your schema
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(prev => ({ ...prev, [activityId]: commentsData || [] }));
    } catch (error) {
      logger.error('Error loading comments:', error, { component: 'ActivityFeed', action: 'component_action' });
    }
  };

  const toggleComments = async (activityId: string) => {
    hapticLight();
    const isShowing = showComments[activityId];

    if (!isShowing) {
      await loadComments(activityId);
    }

    setShowComments(prev => ({ ...prev, [activityId]: !isShowing }));
  };

  const handleAddComment = async (activityId: string) => {
    const content = newComment[activityId]?.trim();
    if (!content || isSubmitting || !user) return;

    try {
      setIsSubmitting(true);

      // This would need to be implemented in your goals service
      // await goalsService.createComment(commentInput);

      hapticSuccess();
      setNewComment(prev => ({ ...prev, [activityId]: '' }));
      await loadComments(activityId);
    } catch (error) {
      logger.error('Error adding comment:', error, { component: 'ActivityFeed', action: 'component_action' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    hapticLight();
    void commentId;
    void emoji;
    try {
      // This would need to be implemented in your goals service
      // await goalsService.toggleCommentReaction(commentId, emoji);
    } catch (error) {
      logger.error('Error adding reaction:', error, { component: 'ActivityFeed', action: 'component_action' });
    }
  };

  const getActivityDescription = (activity: GoalActivity) => {
    const data = activity.activity_data as ActivityData;

    switch (activity.activity_type) {
      case 'goal_created':
        return `Created goal "${activity.entity_title}"`;
      case 'goal_completed':
        return `Completed goal "${activity.entity_title}" 🎉`;
      case 'milestone_completed':
        return `Completed milestone "${activity.entity_title}" for ${data?.goal_title}`;
      case 'check_in_created':
        const progress = data?.progress_percentage;
        const mood = data?.mood;
        const moodEmoji = mood === 'great' ? '😊' : mood === 'okay' ? '😐' : '😓';
        return `Checked in on "${data?.goal_title}" - ${progress}% complete ${moodEmoji}`;
      default:
        return activity.description || activity.title;
    }
  };

  const getActivityIcon = (activityType: string) => {
    const IconComponent = activityIcons[activityType as keyof typeof activityIcons] || MessageCircle;
    const colorClass = activityColors[activityType as keyof typeof activityColors] || 'text-gray-400';
    return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
  };

  const getActivityMetadata = (activity: GoalActivity) => {
    const data = activity.activity_data as ActivityData;
    const metadata = [];

    if (data?.has_voice_note) {
      metadata.push(<Mic key="voice" className="h-3 w-3 text-purple-500" />);
    }

    if (data?.has_notes) {
      metadata.push(<MessageCircle key="notes" className="h-3 w-3 text-blue-500" />);
    }

    if (data?.need_help === true) {
      metadata.push(
        <span key="help" className="px-2 py-1 bg-orange-900/30 text-orange-300 text-xs rounded-full border border-orange-700">
          Needs Help
        </span>
      );
    }

    return metadata;
  };

  const getUserInitials = (user: { name?: string; email?: string; user_metadata?: { name?: string } } | null) => {
    const fullName = user?.name || user?.user_metadata?.name;
    if (fullName) {
      return fullName.split(' ').map((n) => n[0]).join('');
    }
    return user?.email?.[0].toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-xl p-6 ${className}`}>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-700 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl ${className}`}>
      <div className="max-h-96 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Activity Feed
          </h3>

          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm">Start by creating goals and checking in on progress!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id}>
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
                      {activity.user?.avatar_url ? (
                        <Image
                          src={activity.user.avatar_url}
                          alt={activity.user?.name || 'User avatar'}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        getUserInitials(activity.user || null)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActivityIcon(activity.activity_type)}
                        <p className="text-sm">
                          <span className="font-medium">
                            {activity.user?.name}
                          </span>
                          {' '}
                          <span className="text-gray-400">
                            {getActivityDescription(activity)}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{formatDistanceToNow(new Date(activity.created_at))} ago</span>
                        {getActivityMetadata(activity).map((meta, i) => (
                          <span key={i}>{meta}</span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => toggleComments(activity.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-800 rounded"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {comments[activity.id]?.length || 0} Comments
                        </button>
                      </div>

                      {showComments[activity.id] && (
                        <div className="mt-3 space-y-3 pl-4 border-l border-gray-700">
                          {comments[activity.id]?.map((comment) => (
                            <div key={comment.id} className="flex items-start space-x-2">
                              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
                                {comment.user?.avatar_url ? (
                                  <Image
                                    src={comment.user.avatar_url}
                                    alt={comment.user?.name || 'User avatar'}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  getUserInitials(comment.user || null)
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-800 rounded-lg px-3 py-2">
                                  <p className="text-xs font-medium mb-1">
                                    {comment.user?.name}
                                  </p>
                                  <p className="text-sm">{comment.content}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400">
                                    {formatDistanceToNow(new Date(comment.created_at))} ago
                                  </span>
                                  <div className="flex gap-1">
                                    {emojiReactions.slice(0, 3).map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReaction(comment.id, emoji)}
                                        className="w-5 h-5 p-0 text-xs hover:bg-gray-700 rounded transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-800"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          <div className="flex items-start space-x-2">
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
                              {(user as { avatar_url?: string } | null)?.avatar_url ? (
                                <Image
                                  src={(user as { avatar_url: string }).avatar_url}
                                  alt="Your avatar"
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                getUserInitials(user?.user_metadata || user)
                              )}
                            </div>
                            <div className="flex-1 flex gap-2">
                              <textarea
                                placeholder="Add a comment..."
                                value={newComment[activity.id] || ''}
                                onChange={(e) => setNewComment(prev => ({
                                  ...prev,
                                  [activity.id]: e.target.value
                                }))}
                                className="flex-1 min-h-[60px] text-sm resize-none p-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    handleAddComment(activity.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleAddComment(activity.id)}
                                disabled={!newComment[activity.id]?.trim() || isSubmitting}
                                className="px-3 py-2 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                              >
                                Post
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {index < activities.length - 1 && (
                    <div className="my-4 border-t border-gray-700" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
