'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Bell, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

type TimeRange = '1m' | '3m' | '6m' | '12m';

export default function RemindersAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const stats = [
    {
      label: 'Completion Rate',
      value: '84%',
      change: '+9%',
      trend: 'up',
      icon: CheckCircle,
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      label: 'Avg. Response Time',
      value: '18 min',
      change: '-5 min',
      trend: 'up',
      icon: Clock,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Total Reminders',
      value: '287',
      change: '+42',
      trend: 'up',
      icon: Bell,
      gradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Priority Effectiveness',
      value: '91%',
      change: '+7%',
      trend: 'up',
      icon: AlertCircle,
      gradient: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Reminders' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Time Range Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-2">
              Reminders Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor reminder effectiveness and completion patterns
            </p>
          </div>

          {/* Time Range Toggle */}
          <div className="inline-flex items-center bg-pink-50 dark:bg-pink-900/20 rounded-lg p-1 border border-pink-200 dark:border-pink-800">
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
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-pink-700 dark:text-pink-300 hover:text-pink-900 dark:hover:text-pink-100'
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
          {/* Priority Distribution */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Priority Distribution
              </h3>
              <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 border border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'High Priority', value: 25, color: 'bg-red-500' },
                { label: 'Medium Priority', value: 45, color: 'bg-yellow-500' },
                { label: 'Low Priority', value: 30, color: 'bg-green-500' },
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

          {/* Recurring Patterns */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recurring Patterns
              </h3>
              <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 border border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'One-time', value: 55, color: 'bg-pink-500' },
                { label: 'Daily', value: 25, color: 'bg-purple-500' },
                { label: 'Weekly', value: 20, color: 'bg-indigo-500' },
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
