'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Home, DollarSign, TrendingDown, PieChart } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

type TimeRange = '1m' | '3m' | '6m' | '12m';

export default function BudgetAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const stats = [
    {
      label: 'Total Expenses',
      value: '$4,287',
      change: '-$213',
      trend: 'up',
      icon: DollarSign,
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      label: 'Budget Adherence',
      value: '93%',
      change: '+5%',
      trend: 'up',
      icon: PieChart,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Savings Rate',
      value: '18%',
      change: '+3%',
      trend: 'up',
      icon: TrendingDown,
      gradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Household Costs',
      value: '$1,842',
      change: '-$95',
      trend: 'up',
      icon: Home,
      gradient: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Budget & Expenses' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Time Range Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
              Budget & Expenses Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor spending patterns and budget adherence
            </p>
          </div>

          {/* Time Range Toggle */}
          <div className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 rounded-lg p-1 border border-amber-200 dark:border-amber-800">
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
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100'
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
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
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
          {/* Category Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Category Breakdown
              </h3>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Housing', value: 45, color: 'bg-amber-500' },
                { label: 'Groceries', value: 30, color: 'bg-orange-500' },
                { label: 'Utilities', value: 25, color: 'bg-yellow-500' },
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

          {/* Spending Trends */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Spending Trends
              </h3>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Fixed Costs', value: 60, color: 'bg-blue-500' },
                { label: 'Variable Costs', value: 30, color: 'bg-purple-500' },
                { label: 'Discretionary', value: 10, color: 'bg-indigo-500' },
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
