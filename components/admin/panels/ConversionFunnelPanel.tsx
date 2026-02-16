'use client';

import { memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  RefreshCw,
  UserPlus,
  Home,
  Zap,
  Activity,
  Crown,
  ArrowDown,
  Clock,
  BarChart3,
} from 'lucide-react';

interface FunnelStep {
  id: string;
  label: string;
  count: number;
  color: string;
  description: string;
}

interface FunnelData {
  steps: FunnelStep[];
  conversionRates: {
    signupToSpace: number;
    spaceToAction: number;
    actionToActive: number;
    activeToPower: number;
    overallConversion: number;
  };
  topActivationFeatures: { feature: string; users: number }[];
  timeToMilestones: {
    medianSignupToSpace: number | null;
    medianSpaceToAction: number | null;
  };
  lastUpdated: string;
}

/**
 * ConversionFunnelPanel - Visualizes the real user activation journey
 *
 * Funnel stages:
 * 1. Signed Up — Created an account
 * 2. Created Space — Joined or created a household
 * 3. First Action — Used a feature (non-page_view)
 * 4. Weekly Active — Active in last 7 days
 * 5. Power User — 5+ active days this week
 */
export const ConversionFunnelPanel = memo(function ConversionFunnelPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery<FunnelData>({
    queryKey: ['admin-conversion-funnel'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/funnel');
      if (!response.ok) throw new Error('Failed to fetch funnel data');
      const result = await response.json();
      return result.funnel;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const fetchData = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading funnel data...</span>
      </div>
    );
  }

  const steps = data?.steps ?? [];
  const rates = data?.conversionRates ?? {
    signupToSpace: 0,
    spaceToAction: 0,
    actionToActive: 0,
    activeToPower: 0,
    overallConversion: 0,
  };
  const topFeatures = data?.topActivationFeatures ?? [];
  const milestones = data?.timeToMilestones ?? {
    medianSignupToSpace: null,
    medianSpaceToAction: null,
  };

  const stepIcons: Record<string, typeof UserPlus> = {
    signups: UserPlus,
    space: Home,
    action: Zap,
    active: Activity,
    power: Crown,
  };

  const stepColors: Record<string, { bg: string; text: string; border: string; bar: string }> = {
    blue: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-800', bar: 'bg-blue-500' },
    purple: { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-800', bar: 'bg-purple-500' },
    green: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-800', bar: 'bg-green-500' },
    emerald: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-800', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-800', bar: 'bg-amber-500' },
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 50) return 'text-green-400';
    if (rate >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatHours = (hours: number | null) => {
    if (hours === null) return '--';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const maxStepCount = steps.length > 0 ? Math.max(...steps.map(s => s.count), 1) : 1;

  const conversionSteps = [
    { label: 'Signup → Space', value: rates.signupToSpace, desc: 'create a household' },
    { label: 'Space → Action', value: rates.spaceToAction, desc: 'use a feature' },
    { label: 'Action → Active', value: rates.actionToActive, desc: 'return weekly' },
    { label: 'Active → Power', value: rates.activeToPower, desc: 'use 5+ days/week' },
  ];

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">User Activation Funnel</h3>
            <p className="text-xs text-gray-400">
              Journey from signup to power user
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

      {/* Funnel Visualization — vertical waterfall */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = stepIcons[step.id] || Activity;
          const colors = stepColors[step.color] || stepColors.blue;
          const barWidth = maxStepCount > 0 ? (step.count / maxStepCount) * 100 : 0;
          const prevCount = index > 0 ? steps[index - 1].count : null;
          const dropOff = prevCount !== null && prevCount > 0
            ? Math.round(((prevCount - step.count) / prevCount) * 100)
            : null;

          return (
            <div key={step.id}>
              {/* Drop-off indicator between steps */}
              {dropOff !== null && (
                <div className="flex items-center gap-2 py-1.5 pl-4">
                  <ArrowDown className="w-3 h-3 text-gray-500" />
                  <span className={`text-xs font-medium ${dropOff > 50 ? 'text-red-400' : dropOff > 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {dropOff}% drop-off
                  </span>
                  <span className="text-xs text-gray-500">
                    ({prevCount! - step.count} users lost)
                  </span>
                </div>
              )}

              <div className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-sm font-medium text-white">{step.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-bold ${colors.text}`}>{step.count}</span>
                    {index > 0 && steps[0].count > 0 && (
                      <span className="text-xs text-gray-400">
                        ({Math.round((step.count / steps[0].count) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                {/* Progress bar relative to first step */}
                <div className="w-full bg-gray-700/50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${colors.bar} transition-all duration-500`}
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {conversionSteps.map((cs) => (
          <div key={cs.label} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-xs font-medium text-gray-400 mb-1">{cs.label}</p>
            <p className={`text-xl font-bold ${getConversionColor(cs.value)}`}>
              {cs.value}%
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{cs.desc}</p>
          </div>
        ))}
      </div>

      {/* Bottom row: Time-to-Milestone + Feature Adoption */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time to Milestones */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">Time to Milestone</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Signup → Space</span>
                <span className="text-sm font-bold text-purple-400">
                  {formatHours(milestones.medianSignupToSpace)}
                </span>
              </div>
              <p className="text-xs text-gray-500">Median time to create first household</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Space → First Action</span>
                <span className="text-sm font-bold text-purple-400">
                  {formatHours(milestones.medianSpaceToAction)}
                </span>
              </div>
              <p className="text-xs text-gray-500">Median time to first feature use</p>
            </div>
          </div>
        </div>

        {/* Feature Adoption */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Top Activation Features</span>
          </div>
          {topFeatures.length > 0 ? (
            <div className="space-y-2.5">
              {topFeatures.slice(0, 5).map((f) => {
                const maxUsers = topFeatures.length > 0 ? topFeatures[0].users : 1;
                const width = maxUsers > 0 ? (f.users / maxUsers) * 100 : 0;
                return (
                  <div key={f.feature}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-300 capitalize">{f.feature}</span>
                      <span className="text-gray-400">{f.users} users</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.max(width, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No feature data yet</p>
          )}
        </div>
      </div>

      {/* Overall Conversion */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">Overall: Signup → Power User</p>
          <p className="text-xs text-gray-500 mt-0.5">End-to-end activation rate</p>
        </div>
        <p className={`text-2xl font-bold ${getConversionColor(rates.overallConversion)}`}>
          {rates.overallConversion}%
        </p>
      </div>
    </div>
  );
});
