'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  Target,
  CheckCircle2,
  Circle,
  Calendar,
  Flame,
  TrendingUp,
  TrendingDown,
  Plus,
  Settings,
  BarChart3,
  Clock,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isToday, isSameDay, parseISO } from 'date-fns';
import { recurringGoalsService, RecurringGoalTemplate, HabitEntry, HabitStreak } from '@/lib/services/recurring-goals-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';

interface HabitTrackerProps {
  spaceId: string;
}

interface HabitWithData {
  template: RecurringGoalTemplate;
  entry?: HabitEntry;
  streak?: HabitStreak;
  completionRate?: {
    rate: number;
    completed: number;
    total: number;
    streak: number;
  };
}

type ViewMode = 'today' | 'week' | 'month';

const HABIT_CATEGORIES = [
  { value: 'health', label: 'Health & Fitness', icon: '💪', color: 'bg-green-500' },
  { value: 'learning', label: 'Learning', icon: '📚', color: 'bg-blue-500' },
  { value: 'productivity', label: 'Productivity', icon: '⚡', color: 'bg-purple-500' },
  { value: 'mindfulness', label: 'Mindfulness', icon: '🧘', color: 'bg-indigo-500' },
  { value: 'creativity', label: 'Creativity', icon: '🎨', color: 'bg-pink-500' },
  { value: 'social', label: 'Social', icon: '👥', color: 'bg-orange-500' },
  { value: 'finance', label: 'Finance', icon: '💰', color: 'bg-emerald-500' },
  { value: 'general', label: 'General', icon: '📋', color: 'bg-gray-500' },
];

export function HabitTracker({ spaceId }: HabitTrackerProps) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<HabitWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load habits data
  const loadHabits = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const todaysHabits = await recurringGoalsService.getTodaysHabits(spaceId);

      // Enrich with completion rate data
      const enrichedHabits = await Promise.all(
        todaysHabits.map(async (habit) => {
          try {
            const completionRate = await recurringGoalsService.calculateCompletionRate(habit.template.id, 30);
            return {
              ...habit,
              completionRate,
            };
          } catch (error) {
            logger.error('Error getting completion rate for habit ${habit.template.id}:', error, { component: 'HabitTracker', action: 'component_action' });
            return habit;
          }
        })
      );

      setHabits(enrichedHabits);
    } catch (error) {
      logger.error('Error loading habits:', error, { component: 'HabitTracker', action: 'component_action' });
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Handle habit completion toggle
  const handleToggleHabit = async (template: RecurringGoalTemplate, completed: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      await recurringGoalsService.upsertHabitEntry({
        template_id: template.id,
        entry_date: today,
        completed,
        completion_value: completed ? template.target_value : 0,
      });

      toast.success(completed ? 'Habit completed! 🎉' : 'Habit unmarked');
      await loadHabits(); // Reload to update streaks
    } catch (error) {
      logger.error('Error toggling habit:', error, { component: 'HabitTracker', action: 'component_action' });
      toast.error('Failed to update habit');
    }
  };

  // Filter habits by category
  const filteredHabits = habits.filter(habit =>
    selectedCategory === 'all' || habit.template.habit_category === selectedCategory
  );

  // Get week dates for week view
  const getWeekDates = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start from Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Get category info
  const getCategoryInfo = (category?: string) => {
    return HABIT_CATEGORIES.find(cat => cat.value === category) || HABIT_CATEGORIES[HABIT_CATEGORIES.length - 1];
  };

  // Calculate total stats
  const totalStats = {
    total: habits.length,
    completed: habits.filter(h => h.entry?.completed).length,
    rate: habits.length > 0 ? Math.round((habits.filter(h => h.entry?.completed).length / habits.length) * 100) : 0,
    activeStreaks: habits.filter(h => h.streak?.is_active && h.streak.streak_count > 0).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Habits</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalStats.completed}/{totalStats.total}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Progress</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.rate}%</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.activeStreaks}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Streaks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['today', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                viewMode === mode
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {HABIT_CATEGORIES.slice(0, -1).map((category) => (
              <option key={category.value} value={category.value}>
                {category.icon} {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Habits List */}
      {viewMode === 'today' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHabits.map((habit) => {
            const categoryInfo = getCategoryInfo(habit.template.habit_category);
            const isCompleted = habit.entry?.completed || false;
            const currentStreak = habit.streak?.streak_count || 0;
            const completionRate = habit.completionRate?.rate || 0;

            return (
              <div
                key={habit.template.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${categoryInfo.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                      {categoryInfo.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {habit.template.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {categoryInfo.label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleHabit(habit.template, !isCompleted)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-gray-300 dark:border-gray-600 hover:border-green-500'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-5 h-5" />}
                  </button>
                </div>

                {/* Description */}
                {habit.template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {habit.template.description}
                  </p>
                )}

                {/* Stats */}
                <div className="space-y-3">
                  {/* Current Streak */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Current Streak</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {currentStreak} days
                    </span>
                  </div>

                  {/* Completion Rate */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">30-day Rate</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {completionRate.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, completionRate)}%` }}
                    />
                  </div>
                </div>

                {/* Target */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Target</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {habit.template.target_value} {habit.template.target_unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Week of {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Habit
                  </th>
                  {getWeekDates().map((date) => (
                    <th key={date.toISOString()} className="text-center py-2 px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      <div>
                        <div className="text-xs">{format(date, 'EEE')}</div>
                        <div className={`text-sm ${isToday(date) ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                          {format(date, 'd')}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHabits.map((habit) => (
                  <tr key={habit.template.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 ${getCategoryInfo(habit.template.habit_category).color} rounded text-white text-xs flex items-center justify-center`}>
                          {getCategoryInfo(habit.template.habit_category).icon}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {habit.template.title}
                        </span>
                      </div>
                    </td>
                    {getWeekDates().map((date) => (
                      <td key={date.toISOString()} className="text-center py-3 px-2">
                        <div className="w-8 h-8 mx-auto rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          {/* Placeholder for week view completion status */}
                          <Circle className="w-4 h-4 text-gray-400" />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredHabits.length === 0 && !loading && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No habits found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {selectedCategory === 'all'
              ? "Start building consistent habits to track your progress"
              : `No habits found in the ${getCategoryInfo(selectedCategory).label} category`
            }
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use the "New Habit" button above to get started.
          </p>
        </div>
      )}
    </div>
  );
}