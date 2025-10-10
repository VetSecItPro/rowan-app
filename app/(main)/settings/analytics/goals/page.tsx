'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Target, Award, TrendingUp, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

type TimeRange = '1m' | '3m' | '6m' | '12m';

export default function GoalsAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const stats = [
    {
      label: 'Goals Completed',
      value: '24',
      change: '+8',
      trend: 'up',
      icon: CheckCircle,
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      label: 'Completion Rate',
      value: '78%',
      change: '+14%',
      trend: 'up',
      icon: Target,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Milestones Hit',
      value: '67',
      change: '+19',
      trend: 'up',
      icon: Award,
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Progress Velocity',
      value: 'Fast',
      change: '+22%',
      trend: 'up',
      icon: TrendingUp,
      gradient: 'from-green-500 to-green-600',
    },
  ];

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Goals & Milestones' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Time Range Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              Goals & Milestones Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track goal progress and milestone achievements
            </p>
          </div>

          {/* Time Range Toggle */}
          <div className="inline-flex items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-1 border border-indigo-200 dark:border-indigo-800">
            {[
              { value: '1m', label: 'Last Month' },
              { value: '3m', label: 'Last 3 Months' },
              { value: '6m', label: 'Last 6 Months' },
              { value: '12m', label: 'Last 12 Months' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as TimeRange)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  timeRange === option.value
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Metrics Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goal Completion */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Goal Completion
              </h3>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Personal Goals', value: 65, color: 'bg-indigo-500' },
                { label: 'Shared Goals', value: 55, color: 'bg-blue-500' },
                { label: 'Financial Goals', value: 45, color: 'bg-purple-500' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievement Trends */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Achievement Trends
              </h3>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Short-term (< 3 months)', value: 80, color: 'bg-green-500' },
                { label: 'Mid-term (3-12 months)', value: 60, color: 'bg-yellow-500' },
                { label: 'Long-term (> 12 months)', value: 40, color: 'bg-orange-500' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}
