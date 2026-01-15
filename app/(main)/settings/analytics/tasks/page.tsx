'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { CheckSquare, TrendingUp, Clock, Target } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

type TimeRange = '1m' | '3m' | '6m' | '12m';

export default function TasksAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const stats = [
    {
      label: 'Completion Rate',
      value: '87%',
      change: '+12%',
      trend: 'up',
      icon: CheckSquare,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Avg. Time to Complete',
      value: '2.3 days',
      change: '-0.5 days',
      trend: 'up',
      icon: Clock,
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Total Completed',
      value: '143',
      change: '+28',
      trend: 'up',
      icon: Target,
      gradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Productivity Trend',
      value: 'Rising',
      change: '+15%',
      trend: 'up',
      icon: TrendingUp,
      gradient: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Tasks & Chores' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Time Range Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 mb-2">
              Tasks & Chores Analytics
            </h1>
            <p className="text-gray-400">
              Track productivity and completion trends for tasks and household chores
            </p>
          </div>

          {/* Time Range Toggle */}
          <div className="inline-flex items-center bg-blue-900/20 rounded-lg p-1 border border-blue-800">
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
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-blue-300 hover:text-blue-100'
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
                className="bg-gray-800 border border-gray-700 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-400">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Metrics Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Distribution */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                Task Distribution
              </h3>
              <span className="px-3 py-1 bg-blue-900/30 border border-blue-700 text-blue-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Personal Tasks', value: 45, color: 'bg-blue-500' },
                { label: 'Shared Tasks', value: 35, color: 'bg-purple-500' },
                { label: 'Household Chores', value: 20, color: 'bg-green-500' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {item.value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Productivity Trends */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                Productivity Trends
              </h3>
              <span className="px-3 py-1 bg-blue-900/30 border border-blue-700 text-blue-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Morning (6am-12pm)', value: 65, color: 'bg-amber-500' },
                { label: 'Afternoon (12pm-6pm)', value: 85, color: 'bg-orange-500' },
                { label: 'Evening (6pm-12am)', value: 45, color: 'bg-indigo-500' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {item.value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
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
