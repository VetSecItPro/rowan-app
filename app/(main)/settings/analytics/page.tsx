'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import {
  BarChart3,
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Home,
  Target,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    id: 'tasks',
    title: 'Tasks & Chores',
    description: 'Track productivity and completion trends for tasks and household chores',
    icon: CheckSquare,
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    darkBgColor: 'dark:bg-blue-900/30',
    shadowColor: 'shadow-blue-500/20',
    href: '/settings/analytics/tasks',
    metrics: [
      'Completion rates',
      'Task distribution',
      'Time to completion',
      'Productivity trends'
    ]
  },
  {
    id: 'calendar',
    title: 'Calendar & Events',
    description: 'Analyze your scheduling patterns and event attendance',
    icon: Calendar,
    gradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    darkBgColor: 'dark:bg-purple-900/30',
    shadowColor: 'shadow-purple-500/20',
    href: '/settings/analytics/calendar',
    metrics: [
      'Event frequency',
      'Schedule density',
      'Attendance tracking',
      'Time allocation'
    ]
  },
  {
    id: 'reminders',
    title: 'Reminders',
    description: 'Monitor reminder effectiveness and completion patterns',
    icon: Bell,
    gradient: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500',
    textColor: 'text-pink-600',
    darkBgColor: 'dark:bg-pink-900/30',
    shadowColor: 'shadow-pink-500/20',
    href: '/settings/analytics/reminders',
    metrics: [
      'Completion rates',
      'Response time',
      'Recurring patterns',
      'Priority distribution'
    ]
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Review messaging activity and communication trends',
    icon: MessageCircle,
    gradient: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    darkBgColor: 'dark:bg-green-900/30',
    shadowColor: 'shadow-green-500/20',
    href: '/settings/analytics/messages',
    metrics: [
      'Message volume',
      'Response time',
      'Peak activity hours',
      'Conversation threads'
    ]
  },
  {
    id: 'shopping',
    title: 'Shopping Lists',
    description: 'Analyze shopping patterns and spending insights',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    darkBgColor: 'dark:bg-emerald-900/30',
    shadowColor: 'shadow-emerald-500/20',
    href: '/settings/analytics/shopping',
    metrics: [
      'Purchase frequency',
      'List completion',
      'Item categories',
      'Shopping trends'
    ]
  },
  {
    id: 'meals',
    title: 'Meal Planning',
    description: 'Track meal planning habits and recipe usage',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    darkBgColor: 'dark:bg-orange-900/30',
    shadowColor: 'shadow-orange-500/20',
    href: '/settings/analytics/meals',
    metrics: [
      'Meal frequency',
      'Recipe favorites',
      'Planning consistency',
      'Diet balance'
    ]
  },
  {
    id: 'budget',
    title: 'Budget & Expenses',
    description: 'Monitor spending patterns and budget adherence',
    icon: Home,
    gradient: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    darkBgColor: 'dark:bg-amber-900/30',
    shadowColor: 'shadow-amber-500/20',
    href: '/settings/analytics/budget',
    metrics: [
      'Spending trends',
      'Budget vs. actual',
      'Category breakdown',
      'Savings rate'
    ]
  },
  {
    id: 'goals',
    title: 'Goals & Milestones',
    description: 'Track goal progress and milestone achievements',
    icon: Target,
    gradient: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-500',
    textColor: 'text-indigo-600',
    darkBgColor: 'dark:bg-indigo-900/30',
    shadowColor: 'shadow-indigo-500/20',
    href: '/settings/analytics/goals',
    metrics: [
      'Goal completion',
      'Milestone tracking',
      'Progress velocity',
      'Achievement trends'
    ]
  }
];

export default function AnalyticsPage() {
  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics' }
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feature Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.id}
                href={feature.href}
                className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 ${feature.shadowColor} transition-all duration-300 group`}
              >
                {/* Icon and Title */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.gradient} ${feature.shadowColor} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{feature.title}</h3>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {feature.description}
                </p>

                {/* Metrics */}
                <ul className="space-y-2 mb-4">
                  {feature.metrics.map((metric, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className={`w-1.5 h-1.5 rounded-full ${feature.bgColor}`} />
                      {metric}
                    </li>
                  ))}
                </ul>

                {/* View Link */}
                <div className={`flex items-center gap-2 ${feature.textColor} font-medium text-sm group-hover:gap-3 transition-all`}>
                  View Analytics
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </FeatureLayout>
  );
}
