'use client';

import React, { memo, useMemo } from 'react';
import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Home,
  Target,
} from 'lucide-react';
import { formatTimestamp } from '@/lib/utils/date-utils';
import type { EnhancedDashboardStats } from '@/lib/hooks/useDashboardStats';
import { StatCard, ProgressBar, type StatCardConfig } from './StatCard';

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="bg-gray-800/40 border border-gray-700/20 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg animate-pulse">
      <div className="h-28 sm:h-32 bg-gray-700 rounded" />
    </div>
  );
}

// ─── Card Config Builder ──────────────────────────────────────────────────────

function buildCardConfigs(stats: EnhancedDashboardStats): StatCardConfig[] {
  return [
    // ── Tasks & Chores ──
    {
      href: '/tasks',
      title: 'Tasks & Chores',
      linkClass: 'hover:border-blue-500 hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)]',
      titleClass: 'text-blue-400',
      footerClass: 'text-blue-400',
      icon: CheckSquare,
      iconGradient: 'from-blue-500 to-blue-600',
      mainValue: stats.tasks.pending,
      mainLabel: 'pending',
      trend: stats.tasks.trend,
      trendLabel: 'this week',
      details: [
        { left: `${stats.tasks.pending} pending`, right: `${stats.tasks.inProgress} in progress` },
      ],
      alerts: [
        ...(stats.tasks.dueToday > 0
          ? [{ text: `${stats.tasks.dueToday} due today`, colorClass: 'text-orange-400', icon: 'clock' as const }]
          : []),
        ...(stats.tasks.overdue > 0
          ? [{ text: `${stats.tasks.overdue} overdue`, colorClass: 'text-red-400', icon: 'alert' as const }]
          : []),
      ],
      extraText: `${stats.tasks.highPriority} high priority • ${stats.tasks.assignedToMe} assigned to you`,
      progress: { value: stats.tasks.completed, max: stats.tasks.total, color: 'blue' },
      recentItems: stats.tasks.recentTasks.map(t => ({ id: t.id, title: t.title })),
    },

    // ── Calendar ──
    {
      href: '/calendar',
      title: 'Calendar',
      linkClass: 'hover:border-purple-500 hover:shadow-[0_20px_50px_rgba(168,85,247,0.5)]',
      titleClass: 'text-purple-400',
      footerClass: 'text-purple-400',
      icon: Calendar,
      iconGradient: 'from-purple-500 to-purple-600',
      mainValue: stats.events.upcoming,
      mainLabel: 'upcoming',
      trend: stats.events.trend,
      trendLabel: 'this week',
      details: [
        { left: `${stats.events.today} today`, right: `${stats.events.thisWeek} this week` },
      ],
      extraText: `${stats.events.personal} personal • ${stats.events.shared} shared`,
      highlight: stats.events.nextEvent
        ? {
            label: 'Next event:',
            title: stats.events.nextEvent.title,
            subtitle: formatTimestamp(stats.events.nextEvent.start_time, 'MMM d, h:mm a'),
            bgClass: 'bg-purple-900/20',
            labelClass: 'text-purple-300',
          }
        : undefined,
    },

    // ── Reminders ──
    {
      href: '/reminders',
      title: 'Reminders',
      linkClass: 'hover:border-pink-500 hover:shadow-[0_20px_50px_rgba(236,72,153,0.5)]',
      titleClass: 'text-pink-400',
      footerClass: 'text-orange-400',
      icon: Bell,
      iconGradient: 'from-pink-500 to-pink-600',
      mainValue: stats.reminders.active,
      mainLabel: 'active',
      trend: stats.reminders.trend,
      trendLabel: 'this week',
      alerts: [
        ...(stats.reminders.overdue > 0
          ? [{ text: `${stats.reminders.overdue} overdue`, colorClass: 'text-red-400', icon: 'alert' as const }]
          : []),
        ...(stats.reminders.dueToday > 0
          ? [{ text: `${stats.reminders.dueToday} due today`, colorClass: 'text-pink-400', icon: 'clock' as const }]
          : []),
      ],
      extraText: `${stats.reminders.completed} completed • ${stats.reminders.total} total`,
      highlight: stats.reminders.nextDue
        ? {
            label: 'Next due:',
            title: stats.reminders.nextDue.title,
            subtitle: formatTimestamp(stats.reminders.nextDue.reminder_time, 'MMM d, h:mm a'),
            bgClass: 'bg-orange-900/20',
            labelClass: 'text-orange-300',
          }
        : undefined,
    },

    // ── Messages ──
    {
      href: '/messages',
      title: 'Messages',
      linkClass: 'hover:border-green-500 hover:shadow-[0_20px_50px_rgba(34,197,94,0.5)]',
      titleClass: 'text-green-400',
      footerClass: 'text-green-400',
      icon: MessageCircle,
      iconGradient: 'from-green-500 to-green-600',
      mainValue: stats.messages.total,
      mainLabel: 'total',
      trend: stats.messages.trend,
      trendLabel: 'this week',
      details: [
        { left: `${stats.messages.today} today`, right: `${stats.messages.conversations} conversations` },
      ],
      alerts: stats.messages.unread > 0
        ? [{ text: `${stats.messages.unread} unread`, colorClass: 'text-green-400', icon: 'alert' as const }]
        : [],
      highlight: stats.messages.lastMessage
        ? {
            label: `${stats.messages.lastMessage.sender}:`,
            title: `"${stats.messages.lastMessage.content}"`,
            subtitle: formatTimestamp(stats.messages.lastMessage.created_at, 'h:mm a'),
            bgClass: 'bg-green-900/20',
            labelClass: 'text-green-300',
          }
        : undefined,
    },

    // ── Shopping ──
    {
      href: '/shopping',
      title: 'Shopping',
      linkClass: 'hover:border-teal-500 hover:shadow-[0_20px_50px_rgba(20,184,166,0.5)]',
      titleClass: 'text-teal-400',
      footerClass: 'text-teal-400',
      icon: ShoppingCart,
      iconGradient: 'from-teal-500 to-teal-600',
      mainValue: stats.shopping.uncheckedItems,
      mainLabel: 'remaining',
      trend: stats.shopping.trend,
      trendLabel: 'this week',
      details: [
        { left: `${stats.shopping.totalLists} lists`, right: `${stats.shopping.activeLists} active` },
      ],
      alerts: [
        { text: `${stats.shopping.checkedToday} checked today`, colorClass: 'text-teal-400', icon: 'check' as const },
      ],
      extraText: `${stats.shopping.uncheckedItems} items remaining`,
      highlight: stats.shopping.urgentList
        ? {
            label: 'Urgent:',
            title: `${stats.shopping.uncheckedItems} items for "${stats.shopping.urgentList}"`,
            bgClass: 'bg-teal-900/20',
            labelClass: 'text-teal-300',
          }
        : undefined,
    },

    // ── Meals ──
    {
      href: '/meals',
      title: 'Meals',
      linkClass: 'hover:border-orange-500 hover:shadow-[0_20px_50px_rgba(239,68,68,0.5)]',
      titleClass: 'text-red-400',
      footerClass: 'text-red-400',
      icon: UtensilsCrossed,
      iconGradient: 'from-red-500 to-red-600',
      mainValue: stats.meals.thisWeek,
      mainLabel: 'this week',
      trend: stats.meals.trend,
      trendLabel: 'this week',
      details: [
        { left: `${stats.meals.mealsToday} today`, right: `${stats.meals.thisWeek} this week` },
      ],
      extraText: `${stats.meals.savedRecipes} saved recipes`,
      highlight: stats.meals.nextMeal
        ? {
            label: 'Next meal:',
            title: stats.meals.nextMeal.title,
            subtitle: formatTimestamp(stats.meals.nextMeal.scheduled_date, 'MMM d, h:mm a'),
            bgClass: 'bg-red-900/20',
            labelClass: 'text-red-300',
          }
        : undefined,
    },

    // ── Projects & Budget (custom content) ──
    {
      href: '/projects',
      title: 'Projects & Budget',
      linkClass: 'hover:border-yellow-500 hover:shadow-[0_20px_50px_rgba(234,179,8,0.5)]',
      titleClass: 'text-amber-400',
      footerClass: 'text-amber-400',
      icon: Home,
      iconGradient: 'from-amber-500 to-amber-600',
      mainValue: stats.projects.inProgress,
      mainLabel: 'active',
      trend: stats.projects.trend,
      trendLabel: 'this week',
      details: [
        { left: `${stats.projects.inProgress} in progress`, right: `${stats.projects.completed} completed` },
      ],
      extraText:
        stats.projects.planning > 0 || stats.projects.onHold > 0
          ? `${stats.projects.planning} planning • ${stats.projects.onHold} on hold`
          : undefined,
      customContent: (
        <div className="p-3 bg-amber-900/20 rounded-lg mb-3">
          <p className="text-xs text-amber-300 font-medium mb-1">Monthly Budget:</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-bold">
              ${stats.household.spent.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">
              / ${stats.household.monthlyBudget.toLocaleString()}
            </span>
          </div>
          <ProgressBar
            value={stats.household.spent}
            max={stats.household.monthlyBudget}
            color="amber"
            showLabel={false}
          />
          <p className="text-xs text-gray-400 mt-1">
            {stats.household.pendingBills} pending{' '}
            {stats.household.pendingBills === 1 ? 'bill' : 'bills'} • $
            {stats.projects.totalExpenses.toLocaleString()} total expenses
          </p>
        </div>
      ),
    },

    // ── Goals (custom content with double highlight) ──
    {
      href: '/goals',
      title: 'Goals',
      linkClass: 'hover:border-indigo-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.5)]',
      titleClass: 'text-indigo-400',
      footerClass: 'text-indigo-400',
      icon: Target,
      iconGradient: 'from-indigo-500 to-indigo-600',
      mainValue: stats.goals.active,
      mainLabel: 'active',
      trend: stats.goals.trend,
      trendLabel: 'this week',
      details: [
        { left: `${stats.goals.inProgress} in progress`, right: `${stats.goals.completed} completed` },
      ],
      customContent: (
        <>
          {stats.goals.topGoal && (
            <div className="p-3 bg-indigo-900/20 rounded-lg mb-3">
              <p className="text-xs text-indigo-300 font-medium mb-1">Top goal:</p>
              <p className="text-sm text-white font-medium truncate mb-2">
                {stats.goals.topGoal.title}
              </p>
              <ProgressBar
                value={stats.goals.topGoal.progress}
                max={100}
                color="indigo"
                showLabel={false}
              />
              <p className="text-xs text-gray-400 mt-1">
                {stats.goals.topGoal.progress}% complete
              </p>
            </div>
          )}
          <div className="p-3 bg-indigo-900/20 rounded-lg mb-3">
            <p className="text-xs text-indigo-300 font-medium mb-1">Overall progress:</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-bold">
                {stats.goals.overallProgress}%
              </span>
            </div>
            <ProgressBar
              value={stats.goals.overallProgress}
              max={100}
              color="indigo"
              showLabel={false}
            />
            <p className="text-xs text-gray-400 mt-1">{stats.goals.total} total goals</p>
          </div>
        </>
      ),
    },
  ];
}

// ─── StatCardGrid Component ─────────────────────────────────────────────────

export const StatCardGrid = memo(function StatCardGrid({
  stats,
  loading,
}: {
  stats: EnhancedDashboardStats;
  loading: boolean;
}) {
  const configs = useMemo(() => buildCardConfigs(stats), [stats]);

  if (loading) {
    return (
      <div className="grid stats-grid-mobile gap-4 sm:gap-6">
        {[...Array(8)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid stats-grid-mobile gap-4 sm:gap-6">
      {configs.map((config, index) => (
        <StatCard key={config.href} config={config} index={index} />
      ))}
    </div>
  );
});
