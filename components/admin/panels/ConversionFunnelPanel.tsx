'use client';

import { memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  RefreshCw,
  Eye,
  Mail,
  Key,
  UserPlus,
  Activity,
  ArrowRight,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface FunnelStep {
  id: string;
  label: string;
  count: number;
  icon: typeof Eye;
  color: string;
  description: string;
}

interface FunnelData {
  steps: FunnelStep[];
  conversionRates: {
    requestToCode: number;
    codeToSignup: number;
    overallConversion: number;
  };
  recentConversions: Array<{
    email: string;
    step: string;
    timestamp: string;
  }>;
  lastUpdated: string;
}

/**
 * ConversionFunnelPanel - Visualizes the beta signup funnel
 *
 * Funnel stages:
 * 1. Beta Page Visits (from Vercel Analytics - displayed as info)
 * 2. Beta Code Requests (submitted email)
 * 3. Codes Sent (received invite code)
 * 4. Accounts Created (completed signup)
 *
 * This helps answer: "Where are people dropping off in my beta funnel?"
 */
export const ConversionFunnelPanel = memo(function ConversionFunnelPanel() {
  // Fetch funnel data from API
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-conversion-funnel'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/funnel');
      if (!response.ok) throw new Error('Failed to fetch funnel data');
      const result = await response.json();
      return result.funnel as FunnelData;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const fetchData = useCallback(() => {
    refetch();
  }, [refetch]);

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading funnel data...</span>
      </div>
    );
  }

  // Default/fallback data if API hasn't been implemented yet
  const funnel = data || {
    steps: [
      { id: 'requests', label: 'Beta Requests', count: 0, icon: Mail, color: 'blue', description: 'Submitted email for beta access' },
      { id: 'codes', label: 'Codes Sent', count: 0, icon: Key, color: 'purple', description: 'Received invite code via email' },
      { id: 'signups', label: 'Accounts Created', count: 0, icon: UserPlus, color: 'green', description: 'Completed registration' },
      { id: 'active', label: 'Active Users', count: 0, icon: Activity, color: 'emerald', description: 'Logged in at least once' },
    ],
    conversionRates: {
      requestToCode: 0,
      codeToSignup: 0,
      overallConversion: 0,
    },
    recentConversions: [],
    lastUpdated: new Date().toISOString(),
  };

  const stepIcons = {
    requests: Mail,
    codes: Key,
    signups: UserPlus,
    active: Activity,
  };

  const stepColors: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
      bg: 'bg-blue-900/30',
      text: 'text-blue-400',
      border: 'border-blue-800',
    },
    purple: {
      bg: 'bg-purple-900/30',
      text: 'text-purple-400',
      border: 'border-purple-800',
    },
    green: {
      bg: 'bg-green-900/30',
      text: 'text-green-400',
      border: 'border-green-800',
    },
    emerald: {
      bg: 'bg-emerald-900/30',
      text: 'text-emerald-400',
      border: 'border-emerald-800',
    },
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 50) return 'text-green-400';
    if (rate >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Conversion Funnel
            </h3>
            <p className="text-xs text-gray-400">
              Beta signup journey from request to active user
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Funnel Visualization */}
      <div className="relative">
        <div className="grid grid-cols-4 gap-2">
          {funnel.steps.map((step, index) => {
            const Icon = stepIcons[step.id as keyof typeof stepIcons] || Activity;
            const colors = stepColors[step.color] || stepColors.blue;
            const maxCount = Math.max(...funnel.steps.map(s => s.count), 1);
            const widthPercent = Math.max((step.count / maxCount) * 100, 30);

            return (
              <div key={step.id} className="relative">
                {/* Connector Arrow */}
                {index < funnel.steps.length - 1 && (
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-gray-600" />
                  </div>
                )}

                <div className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-xs font-medium text-gray-400">
                      {step.label}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {step.count}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-xs font-medium text-gray-400 mb-1">
            Request → Code
          </p>
          <p className={`text-xl font-bold ${getConversionColor(funnel.conversionRates.requestToCode)}`}>
            {funnel.conversionRates.requestToCode}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            of requests get codes
          </p>
        </div>
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-xs font-medium text-gray-400 mb-1">
            Code → Signup
          </p>
          <p className={`text-xl font-bold ${getConversionColor(funnel.conversionRates.codeToSignup)}`}>
            {funnel.conversionRates.codeToSignup}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            of codes become users
          </p>
        </div>
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-xs font-medium text-gray-400 mb-1">
            Overall Conversion
          </p>
          <p className={`text-xl font-bold ${getConversionColor(funnel.conversionRates.overallConversion)}`}>
            {funnel.conversionRates.overallConversion}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            request to active user
          </p>
        </div>
      </div>

      {/* Recent Conversions */}
      <div className="border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase">
              Recent Activity
            </span>
            <span className="text-xs text-gray-400">Last 7 days</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {funnel.recentConversions.length > 0 ? (
            <div className="divide-y divide-gray-700">
              {funnel.recentConversions.map((conversion, index) => (
                <div
                  key={index}
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {conversion.email.replace(/(.{2}).*(@.*)/, '$1***$2')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {conversion.step}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(conversion.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent conversions</p>
              <p className="text-xs mt-1">Activity will appear as users progress through the funnel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
