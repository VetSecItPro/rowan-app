'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { MessageCircle, Send, Clock, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

type TimeRange = '1m' | '3m' | '6m' | '12m';

export default function MessagesAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const stats = [
    {
      label: 'Total Messages',
      value: '1,245',
      change: '+187',
      trend: 'up',
      icon: MessageCircle,
      gradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Avg. Response Time',
      value: '12 min',
      change: '-3 min',
      trend: 'up',
      icon: Clock,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Messages Sent',
      value: '623',
      change: '+94',
      trend: 'up',
      icon: Send,
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Activity Trend',
      value: 'Rising',
      change: '+22%',
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
        { label: 'Messages' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Time Range Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-green-400 mb-2">
              Messages Analytics
            </h1>
            <p className="text-gray-400">
              Review messaging activity and communication trends
            </p>
          </div>

          {/* Time Range Toggle */}
          <div className="inline-flex items-center bg-green-900/20 rounded-lg p-1 border border-green-800">
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
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-green-300 hover:text-green-100'
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
          {/* Message Volume */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                Message Volume
              </h3>
              <span className="px-3 py-1 bg-green-900/30 border border-green-700 text-green-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Direct Messages', value: 60, color: 'bg-green-500' },
                { label: 'Group Threads', value: 25, color: 'bg-blue-500' },
                { label: 'Announcements', value: 15, color: 'bg-purple-500' },
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

          {/* Peak Activity Hours */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                Peak Activity Hours
              </h3>
              <span className="px-3 py-1 bg-green-900/30 border border-green-700 text-green-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Morning (6am-12pm)', value: 35, color: 'bg-amber-500' },
                { label: 'Afternoon (12pm-6pm)', value: 45, color: 'bg-orange-500' },
                { label: 'Evening (6pm-12am)', value: 75, color: 'bg-indigo-500' },
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
