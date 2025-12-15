'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { goalsService, Goal, Milestone } from '@/lib/services/goals-service';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Target, Trophy, Clock, Filter } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isAfter,
  isBefore,
  addDays,
  startOfDay
} from 'date-fns';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

interface MilestoneWithGoal extends Milestone {
  goal: Pick<Goal, 'id' | 'title' | 'category' | 'status'>;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'milestone' | 'goal' | 'deadline';
  date: Date;
  goal: Pick<Goal, 'id' | 'title' | 'category' | 'status'>;
  milestone?: Milestone;
  isOverdue?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

type FilterOption = 'all' | 'milestones' | 'deadlines' | 'overdue';
type CategoryFilter = 'all' | 'financial' | 'health' | 'home' | 'relationship' | 'career' | 'personal' | 'education' | 'family';

const categoryColors = {
  financial: 'bg-amber-500',
  health: 'bg-red-500',
  home: 'bg-blue-500',
  relationship: 'bg-pink-500',
  career: 'bg-purple-500',
  personal: 'bg-green-500',
  education: 'bg-indigo-500',
  family: 'bg-orange-500',
  default: 'bg-gray-500'
};

export default function GoalsCalendarPage() {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (!spaceId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const goalsData = await goalsService.getGoals(spaceId);
        setGoals(goalsData);

        // Transform goals and milestones into calendar events
        const calendarEvents: CalendarEvent[] = [];
        const today = startOfDay(new Date());

        goalsData.forEach(goal => {
          // Add goal deadline if it has a target_date
          if (goal.target_date) {
            const goalDate = parseISO(goal.target_date);
            const isOverdue = isBefore(goalDate, today) && goal.status === 'active';

            calendarEvents.push({
              id: `goal-${goal.id}`,
              title: goal.title,
              type: 'goal',
              date: goalDate,
              goal: {
                id: goal.id,
                title: goal.title,
                category: goal.category || 'personal',
                status: goal.status
              },
              isOverdue,
              priority: isOverdue ? 'high' : 'medium'
            });
          }

          // Add milestones with target dates
          goal.milestones?.forEach(milestone => {
            if (milestone.target_date) {
              const milestoneDate = parseISO(milestone.target_date);
              const isOverdue = isBefore(milestoneDate, today) && !milestone.completed;

              calendarEvents.push({
                id: `milestone-${milestone.id}`,
                title: milestone.title,
                type: 'milestone',
                date: milestoneDate,
                goal: {
                  id: goal.id,
                  title: goal.title,
                  category: goal.category || 'personal',
                  status: goal.status
                },
                milestone,
                isOverdue,
                priority: isOverdue ? 'high' : milestone.completed ? 'low' : 'medium'
              });
            }
          });
        });

        setEvents(calendarEvents);
      } catch (err) {
        logger.error('Failed to fetch calendar data:', err, { component: 'page', action: 'execution' });
        setError('Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [spaceId]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const filteredEvents = events.filter(event => {
    // Apply type filter
    if (filter === 'milestones' && event.type !== 'milestone') return false;
    if (filter === 'deadlines' && event.type !== 'goal') return false;
    if (filter === 'overdue' && !event.isOverdue) return false;

    // Apply category filter
    if (categoryFilter !== 'all' && event.goal.category !== categoryFilter) return false;

    return true;
  });

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return filteredEvents.filter(event => isSameDay(event.date, date));
  };

  const getUpcomingEvents = (): CalendarEvent[] => {
    const nextWeek = addDays(new Date(), 7);
    return filteredEvents
      .filter(event => isAfter(event.date, new Date()) && isBefore(event.date, nextWeek))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  };

  const getOverdueEvents = (): CalendarEvent[] => {
    return filteredEvents
      .filter(event => event.isOverdue)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(goals.map(g => g.category || 'personal')));
  const overdueCount = getOverdueEvents().length;
  const upcomingCount = getUpcomingEvents().length;

  if (!spaceId) {
    return <SpacesLoadingState />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/goals"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Goals
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Goals Calendar
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View your goal milestones and deadlines in a calendar format
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Summary Stats */}
            <div className="flex items-center gap-4 text-sm">
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {overdueCount} overdue
                  </span>
                </div>
              )}
              {upcomingCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {upcomingCount} upcoming
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show:</span>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'milestones', label: 'Milestones' },
              { value: 'deadlines', label: 'Deadlines' },
              { value: 'overdue', label: 'Overdue' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as FilterOption)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {dateRange.map(date => {
                  const dayEvents = getEventsForDate(date);
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <div
                      key={date.toISOString()}
                      className={`min-h-[120px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg ${
                        isCurrentMonth
                          ? 'bg-white dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-900/50'
                      } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        isCurrentMonth
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-gray-600'
                      } ${isToday ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                        {format(date, 'd')}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs p-1 rounded text-white ${
                              categoryColors[event.goal.category as keyof typeof categoryColors] || categoryColors.default
                            } ${event.isOverdue ? 'ring-2 ring-red-500' : ''} ${
                              event.milestone?.completed ? 'opacity-60 line-through' : ''
                            }`}
                            title={`${event.title} - ${event.goal.title}`}
                          >
                            <div className="flex items-center gap-1">
                              {event.type === 'milestone' ? (
                                <Trophy className="w-3 h-3" />
                              ) : (
                                <Target className="w-3 h-3" />
                              )}
                              <span className="truncate">{event.title}</span>
                            </div>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Overdue Items */}
          {overdueCount > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                    Overdue Items
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {overdueCount} items need attention
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {getOverdueEvents().slice(0, 5).map(event => (
                  <div
                    key={event.id}
                    className="bg-white dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-2">
                      {event.type === 'milestone' ? (
                        <Trophy className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                      ) : (
                        <Target className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-900 dark:text-red-100 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 truncate">
                          {event.goal.title}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-500">
                          Due {format(event.date, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Items */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Coming Up
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Next 7 days
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {getUpcomingEvents().map(event => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    {event.type === 'milestone' ? (
                      <Trophy className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    ) : (
                      <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                        {event.goal.title}
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-500">
                        {format(event.date, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingCount === 0 && (
                <p className="text-sm text-blue-600 dark:text-blue-400 text-center py-4">
                  No upcoming items in the next 7 days
                </p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Legend
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Milestone</span>
              </div>
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Goal Deadline</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded ring-2 ring-red-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Overdue</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-400 rounded opacity-60" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
