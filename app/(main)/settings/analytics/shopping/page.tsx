'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ShoppingCart, DollarSign, Package, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

type TimeRange = '1m' | '3m' | '6m' | '12m';

export default function ShoppingAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const stats = [
    {
      label: 'Lists Completed',
      value: '42',
      change: '+8',
      trend: 'up',
      icon: ShoppingCart,
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Avg. List Value',
      value: '$127',
      change: '-$12',
      trend: 'up',
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Total Items',
      value: '534',
      change: '+87',
      trend: 'up',
      icon: Package,
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Shopping Frequency',
      value: 'Weekly',
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
        { label: 'Shopping Lists' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Time Range Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-400 mb-2">
              Shopping Lists Analytics
            </h1>
            <p className="text-gray-400">
              Analyze shopping patterns and spending insights
            </p>
          </div>

          {/* Time Range Toggle */}
          <div className="inline-flex items-center bg-emerald-900/20 rounded-lg p-1 border border-emerald-800">
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
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-emerald-300 hover:text-emerald-100'
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
          {/* Item Categories */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                Item Categories
              </h3>
              <span className="px-3 py-1 bg-emerald-900/30 border border-emerald-700 text-emerald-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Groceries', value: 55, color: 'bg-emerald-500' },
                { label: 'Household Items', value: 25, color: 'bg-blue-500' },
                { label: 'Personal Care', value: 20, color: 'bg-purple-500' },
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

          {/* Shopping Trends */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                Shopping Trends
              </h3>
              <span className="px-3 py-1 bg-emerald-900/30 border border-emerald-700 text-emerald-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Weekly Shops', value: 70, color: 'bg-amber-500' },
                { label: 'Bi-weekly Shops', value: 20, color: 'bg-orange-500' },
                { label: 'Monthly Shops', value: 10, color: 'bg-indigo-500' },
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
