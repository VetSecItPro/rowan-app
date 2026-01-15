'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { UtensilsCrossed, Heart, Calendar, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

type TimeRange = '1m' | '3m' | '6m' | '12m';

export default function MealsAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const stats = [
    {
      label: 'Meals Planned',
      value: '186',
      change: '+34',
      trend: 'up',
      icon: UtensilsCrossed,
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Planning Consistency',
      value: '89%',
      change: '+11%',
      trend: 'up',
      icon: Calendar,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Recipe Favorites',
      value: '47',
      change: '+12',
      trend: 'up',
      icon: Heart,
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      label: 'Diet Balance',
      value: 'Excellent',
      change: '+8%',
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
        { label: 'Meal Planning' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Time Range Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-orange-400 mb-2">
              Meal Planning Analytics
            </h1>
            <p className="text-gray-400">
              Track meal planning habits and recipe usage
            </p>
          </div>

          {/* Time Range Toggle */}
          <div className="inline-flex items-center bg-orange-900/20 rounded-lg p-1 border border-orange-800">
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
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-orange-300 hover:text-orange-100'
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
          {/* Meal Frequency */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                Meal Frequency
              </h3>
              <span className="px-3 py-1 bg-orange-900/30 border border-orange-700 text-orange-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Dinner', value: 50, color: 'bg-orange-500' },
                { label: 'Lunch', value: 30, color: 'bg-amber-500' },
                { label: 'Breakfast', value: 20, color: 'bg-yellow-500' },
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

          {/* Diet Balance */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                Diet Balance
              </h3>
              <span className="px-3 py-1 bg-orange-900/30 border border-orange-700 text-orange-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Protein', value: 35, color: 'bg-red-500' },
                { label: 'Vegetables', value: 40, color: 'bg-green-500' },
                { label: 'Carbohydrates', value: 25, color: 'bg-blue-500' },
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
