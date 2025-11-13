'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  Clock,
  Target,
  CheckCircle2,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  Camera,
  Milestone as MilestoneIcon,
  Flag,
  Play,
  Pause,
  X,
  Filter,
  Search,
  AlertCircle,
  Medal,
  Sparkles
} from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { goalsService, type Goal, type Milestone, type GoalCheckIn } from '@/lib/services/goals-service';
import { format, parseISO, isToday, isYesterday, isSameWeek, isSameMonth } from 'date-fns';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

interface TimelineEvent {
  id: string;
  type: 'goal_created' | 'goal_completed' | 'milestone_completed' | 'check_in' | 'goal_paused' | 'goal_resumed';
  date: string;
  goal: Goal;
  milestone?: Milestone;
  checkIn?: GoalCheckIn;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  description: string;
}

interface TimelineGroup {
  date: string;
  label: string;
  events: TimelineEvent[];
}

const EVENT_CONFIGS = {
  goal_created: {
    icon: Target,
    color: 'bg-blue-500',
    borderColor: 'border-blue-200 dark:border-blue-800',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  goal_completed: {
    icon: CheckCircle2,
    color: 'bg-green-500',
    borderColor: 'border-green-200 dark:border-green-800',
    bgColor: 'bg-green-50 dark:bg-green-900/20'
  },
  milestone_completed: {
    icon: MilestoneIcon,
    color: 'bg-purple-500',
    borderColor: 'border-purple-200 dark:border-purple-800',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  },
  check_in: {
    icon: MessageSquare,
    color: 'bg-indigo-500',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
  },
  goal_paused: {
    icon: Pause,
    color: 'bg-orange-500',
    borderColor: 'border-orange-200 dark:border-orange-800',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20'
  },
  goal_resumed: {
    icon: Play,
    color: 'bg-emerald-500',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
  }
};

export default function GoalsTimelinePage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Load timeline data
  useEffect(() => {
    if (spaceId && user) {
      loadTimelineData();
    }
  }, [spaceId, user]);

  const loadTimelineData = async () => {
    if (!spaceId || !user) return;

    try {
      setLoading(true);
      setError(null);

      // Load all goals for the space
      const goalsData = await goalsService.getGoals(spaceId);
      setGoals(goalsData);

      // Create timeline events
      const events: TimelineEvent[] = [];

      for (const goal of goalsData) {
        // Goal creation event
        events.push({
          id: `goal-created-${goal.id}`,
          type: 'goal_created',
          date: goal.created_at,
          goal,
          ...EVENT_CONFIGS.goal_created,
          title: `Goal Created: ${goal.title}`,
          description: goal.description || 'New goal added to your journey'
        });

        // Goal completion event
        if (goal.status === 'completed' && goal.completed_at) {
          events.push({
            id: `goal-completed-${goal.id}`,
            type: 'goal_completed',
            date: goal.completed_at,
            goal,
            ...EVENT_CONFIGS.goal_completed,
            title: `🎉 Goal Completed: ${goal.title}`,
            description: `Congratulations! You've achieved this goal with ${goal.progress}% completion.`
          });
        }

        // Load milestones
        try {
          const milestones = await goalsService.getAllMilestones(goal.id);
          for (const milestone of milestones) {
            if (milestone.completed && milestone.completed_at) {
              events.push({
                id: `milestone-completed-${milestone.id}`,
                type: 'milestone_completed',
                date: milestone.completed_at,
                goal,
                milestone,
                ...EVENT_CONFIGS.milestone_completed,
                title: `Milestone Reached: ${milestone.title}`,
                description: `Achieved milestone for "${goal.title}"`
              });
            }
          }
        } catch (err) {
          console.error(`Failed to load milestones for goal ${goal.id}:`, err);
        }

        // Load recent check-ins (last 30 days)
        try {
          const checkIns = await goalsService.getGoalCheckIns(goal.id);
          const recentCheckIns = checkIns.slice(0, 10); // Show last 10 check-ins

          for (const checkIn of recentCheckIns) {
            events.push({
              id: `check-in-${checkIn.id}`,
              type: 'check_in',
              date: checkIn.created_at,
              goal,
              checkIn,
              ...EVENT_CONFIGS.check_in,
              title: `Check-in: ${goal.title}`,
              description: checkIn.notes || `Progress update: ${checkIn.progress_percentage}%`
            });
          }
        } catch (err) {
          console.error(`Failed to load check-ins for goal ${goal.id}:`, err);
        }
      }

      // Sort events by date (newest first)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Group events by date
      const grouped = groupEventsByDate(events);
      setTimelineGroups(grouped);

    } catch (err) {
      console.error('Failed to load timeline data:', err);
      setError('Failed to load timeline. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const groupEventsByDate = (events: TimelineEvent[]): TimelineGroup[] => {
    const groups: Record<string, TimelineEvent[]> = {};

    for (const event of events) {
      const eventDate = parseISO(event.date);
      const dateKey = format(eventDate, 'yyyy-MM-dd');

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    }

    return Object.entries(groups).map(([dateKey, events]) => {
      const date = parseISO(dateKey);
      let label: string;

      if (isToday(date)) {
        label = 'Today';
      } else if (isYesterday(date)) {
        label = 'Yesterday';
      } else if (isSameWeek(date, new Date())) {
        label = format(date, 'EEEE');
      } else if (isSameMonth(date, new Date())) {
        label = format(date, 'EEEE, MMM d');
      } else {
        label = format(date, 'MMM d, yyyy');
      }

      return {
        date: dateKey,
        label,
        events
      };
    });
  };

  // Filter events
  const filteredGroups = timelineGroups.map(group => ({
    ...group,
    events: group.events.filter(event => {
      const matchesSearch = searchQuery === '' ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.goal.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' ||
        event.goal.category === categoryFilter;

      const matchesType = typeFilter === 'all' || event.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    })
  })).filter(group => group.events.length > 0);

  // Get unique categories
  const categories = Array.from(new Set(goals.map(g => g.category).filter(Boolean))).sort();

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Goals', href: '/goals' },
        { label: 'Timeline' },
      ]}
    >
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Goals Timeline
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Your journey of growth and achievement over time
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search timeline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="all">All Events</option>
                <option value="goal_created">Goals Created</option>
                <option value="goal_completed">Goals Completed</option>
                <option value="milestone_completed">Milestones</option>
                <option value="check_in">Check-ins</option>
              </select>
            </div>
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Loading your timeline...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {goals.length === 0 ? 'Your Journey Awaits' : 'No Events Found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {goals.length === 0
                  ? 'Start creating goals to see your progress timeline here'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {goals.length === 0 && (
                <a
                  href="/goals"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                >
                  <Target className="w-5 h-5" />
                  Create Your First Goal
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {filteredGroups.map((group) => (
                <div key={group.date} className="relative">
                  {/* Date Header */}
                  <div className="sticky top-8 z-10 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                        {group.label}
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800" />
                    </div>
                  </div>

                  {/* Events */}
                  <div className="space-y-6 ml-8">
                    {group.events.map((event, index) => (
                      <TimelineEvent key={event.id} event={event} isLast={index === group.events.length - 1} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FeatureLayout>
  );
}

// Timeline Event Component
interface TimelineEventProps {
  event: TimelineEvent;
  isLast: boolean;
}

function TimelineEvent({ event, isLast }: TimelineEventProps) {
  const Icon = event.icon;
  const config = EVENT_CONFIGS[event.type];

  return (
    <div className="relative flex items-start gap-4">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-6 top-12 w-0.5 h-full bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600" />
      )}

      {/* Event Icon */}
      <div className={`relative z-10 w-12 h-12 rounded-full ${config.color} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Event Content */}
      <div className={`flex-1 p-6 rounded-xl border-2 ${config.borderColor} ${config.bgColor} shadow-sm`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {event.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {format(parseISO(event.date), 'h:mm a')}
            </p>
          </div>

          {/* Goal Category Badge */}
          {event.goal.category && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
              {event.goal.category}
            </span>
          )}
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {event.description}
        </p>

        {/* Additional Event Details */}
        {event.checkIn && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Progress: {event.checkIn.progress_percentage}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                event.checkIn.mood === 'great' ? 'bg-green-500' :
                event.checkIn.mood === 'okay' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                {event.checkIn.mood}
              </span>
            </div>
          </div>
        )}

        {event.milestone && (
          <div className="flex items-center gap-2 text-sm">
            <Medal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-600 dark:text-gray-400">
              Milestone Type: {event.milestone.type}
              {event.milestone.target_value && (
                <span className="ml-1">
                  (Target: {event.milestone.target_value})
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
