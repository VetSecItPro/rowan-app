'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckSquare,
  Calendar,
  Bell,
  MessageSquare,
  ShoppingCart,
  UtensilsCrossed,
  DollarSign,
  Target,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AnalyticsFeature {
  id: string;
  name: string;
  icon: LucideIcon;
  href: string;
  gradient: string;
  textColor: string;
  shadowColor: string;
  description: string;
}

const analyticsFeatures: AnalyticsFeature[] = [
  {
    id: 'tasks',
    name: 'Tasks & Chores',
    icon: CheckSquare,
    href: '/settings/analytics/tasks',
    gradient: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-400',
    shadowColor: 'hover:shadow-blue-900/50',
    description: 'Track task completion and productivity',
  },
  {
    id: 'calendar',
    name: 'Calendar & Events',
    icon: Calendar,
    href: '/settings/analytics/calendar',
    gradient: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-400',
    shadowColor: 'hover:shadow-purple-900/50',
    description: 'Monitor event attendance and planning',
  },
  {
    id: 'reminders',
    name: 'Reminders',
    icon: Bell,
    href: '/settings/analytics/reminders',
    gradient: 'from-pink-500 to-pink-600',
    textColor: 'text-pink-400',
    shadowColor: 'hover:shadow-pink-900/50',
    description: 'Analyze reminder effectiveness',
  },
  {
    id: 'messages',
    name: 'Messages',
    icon: MessageSquare,
    href: '/settings/analytics/messages',
    gradient: 'from-green-500 to-green-600',
    textColor: 'text-green-400',
    shadowColor: 'hover:shadow-green-900/50',
    description: 'View messaging trends and activity',
  },
  {
    id: 'shopping',
    name: 'Shopping Lists',
    icon: ShoppingCart,
    href: '/settings/analytics/shopping',
    gradient: 'from-emerald-500 to-emerald-600',
    textColor: 'text-emerald-400',
    shadowColor: 'hover:shadow-emerald-900/50',
    description: 'Track shopping habits and savings',
  },
  {
    id: 'meals',
    name: 'Meal Planning',
    icon: UtensilsCrossed,
    href: '/settings/analytics/meals',
    gradient: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-400',
    shadowColor: 'hover:shadow-orange-900/50',
    description: 'Review meal planning patterns',
  },
  {
    id: 'budget',
    name: 'Budget Tracking',
    icon: DollarSign,
    href: '/settings/analytics/budget',
    gradient: 'from-amber-500 to-amber-600',
    textColor: 'text-amber-400',
    shadowColor: 'hover:shadow-amber-900/50',
    description: 'Monitor spending and budgets',
  },
  {
    id: 'goals',
    name: 'Goals & Milestones',
    icon: Target,
    href: '/settings/analytics/goals',
    gradient: 'from-indigo-500 to-indigo-600',
    textColor: 'text-indigo-400',
    shadowColor: 'hover:shadow-indigo-900/50',
    description: 'Track goal progress and achievements',
  },
];

const AnalyticsTab = React.memo(() => {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Analytics & Insights</h2>
          <p className="text-sm sm:text-base text-gray-400">
            View your productivity trends and completion rates across all features
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {analyticsFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.id}
              href={feature.href}
              className={`btn-touch bg-gray-800/80 border border-gray-700/50 rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 ${feature.shadowColor} transition-all duration-300 group active:scale-95`}
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className={`text-lg font-semibold ${feature.textColor} mb-2 transition-all`}>
                {feature.name}
              </h3>
              <p className="text-sm text-gray-400 mb-4">{feature.description}</p>
              <div className={`flex items-center text-sm font-medium ${feature.textColor}`}>
                View Analytics
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

AnalyticsTab.displayName = 'AnalyticsTab';

export default AnalyticsTab;
