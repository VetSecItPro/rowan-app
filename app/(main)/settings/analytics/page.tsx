'use client';

import { useState, useEffect, useMemo } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { useAuth } from '@/lib/contexts/auth-context';
import { tasksService } from '@/lib/services/tasks-service';
import { choresService } from '@/lib/services/chores-service';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';

type TimeRange = 'current' | '3months' | '6months' | '12months';

interface MonthlyStats {
  month: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  totalChores: number;
  completedChores: number;
  pendingChores: number;
  totalItems: number;
  completedItems: number;
  completionRate: number;
}

export default function AnalyticsPage() {
  const { currentSpace } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('current');
  const [tasks, setTasks] = useState<any[]>([]);
  const [chores, setChores] = useState<any[]>([]);

  // Load data
  useEffect(() => {
    if (!currentSpace?.id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [tasksResult, choresResult] = await Promise.all([
          tasksService.getTasks(currentSpace.id),
          choresService.getChores(currentSpace.id)
        ]);

        if (tasksResult.success) setTasks(tasksResult.data || []);
        if (choresResult) setChores(choresResult);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentSpace?.id]);

  // Calculate monthly statistics
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const months: MonthlyStats[] = [];

    const monthsToShow = {
      current: 1,
      '3months': 3,
      '6months': 6,
      '12months': 12
    }[timeRange];

    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Filter tasks/chores completed in this month
      const monthTasks = tasks.filter(task => {
        if (!task.completed_at) return false;
        const completedDate = parseISO(task.completed_at);
        return isWithinInterval(completedDate, { start: monthStart, end: monthEnd });
      });

      const monthChores = chores.filter(chore => {
        if (!chore.completed_at) return false;
        const completedDate = parseISO(chore.completed_at);
        return isWithinInterval(completedDate, { start: monthStart, end: monthEnd });
      });

      const totalTasks = monthTasks.length;
      const completedTasks = monthTasks.filter(t => t.status === 'completed').length;
      const pendingTasks = monthTasks.filter(t => t.status === 'pending').length;
      const inProgressTasks = monthTasks.filter(t => t.status === 'in_progress').length;

      const totalChores = monthChores.length;
      const completedChores = monthChores.filter(c => c.status === 'completed').length;
      const pendingChores = monthChores.filter(c => c.status === 'pending').length;

      const totalItems = totalTasks + totalChores;
      const completedItems = completedTasks + completedChores;
      const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      months.push({
        month: format(monthDate, 'MMM yyyy'),
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        totalChores,
        completedChores,
        pendingChores,
        totalItems,
        completedItems,
        completionRate
      });
    }

    return months.reverse(); // Show oldest to newest
  }, [tasks, chores, timeRange]);

  // Overall statistics across all months
  const overallStats = useMemo(() => {
    const totalCompleted = monthlyStats.reduce((sum, m) => sum + m.completedItems, 0);
    const totalItems = monthlyStats.reduce((sum, m) => sum + m.totalItems, 0);
    const avgCompletionRate = monthlyStats.length > 0
      ? Math.round(monthlyStats.reduce((sum, m) => sum + m.completionRate, 0) / monthlyStats.length)
      : 0;

    return {
      totalCompleted,
      totalItems,
      avgCompletionRate,
      totalTasks: monthlyStats.reduce((sum, m) => sum + m.totalTasks, 0),
      totalChores: monthlyStats.reduce((sum, m) => sum + m.totalChores, 0),
    };
  }, [monthlyStats]);

  return (
    <FeatureLayout
      title="Analytics"
      description="Track your productivity and completion trends"
      icon={BarChart3}
    >
      <Breadcrumb
        items={[
          { label: 'Settings', href: '/settings' },
          { label: 'Analytics' }
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Time Range Selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {(['current', '3months', '6months', '12months'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {range === 'current' && 'Current Month'}
                {range === '3months' && 'Last 3 Months'}
                {range === '6months' && 'Last 6 Months'}
                {range === '12months' && 'Last 12 Months'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium text-sm">Total Completed</h3>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{overallStats.totalCompleted}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  of {overallStats.totalItems} total items
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium text-sm">Avg Completion</h3>
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{overallStats.avgCompletionRate}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Across all months</p>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium text-sm">Total Tasks</h3>
                  <AlertCircle className="w-6 h-6 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{overallStats.totalTasks}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed</p>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium text-sm">Total Chores</h3>
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{overallStats.totalChores}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed</p>
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Monthly Breakdown
              </h2>

              {monthlyStats.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg">No data available for this period</p>
                  <p className="text-gray-500 dark:text-gray-500 mt-2">
                    Start completing tasks and chores to see analytics!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyStats.map((stat, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{stat.month}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          stat.completionRate >= 75 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          stat.completionRate >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {stat.completionRate}% Complete
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${stat.completionRate}%` }}
                        />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Completed</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{stat.completedItems} / {stat.totalItems}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Tasks</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{stat.completedTasks} / {stat.totalTasks}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Chores</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{stat.completedChores} / {stat.totalChores}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Pending</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{stat.pendingTasks + stat.pendingChores}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </FeatureLayout>
  );
}
