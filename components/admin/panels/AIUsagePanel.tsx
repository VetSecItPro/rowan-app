'use client';

import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  Bot,
  DollarSign,
  Users,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIUsageData {
  range: string;
  totals: {
    input_tokens: number;
    output_tokens: number;
    voice_seconds: number;
    conversations: number;
    tool_calls: number;
    cost_usd: number;
  };
  active_users_today: number;
  cost_by_feature: { feature: string; cost: number }[];
  cost_by_tier: { tier: string; cost: number }[];
  daily_trend: { date: string; cost: number; input_tokens: number; output_tokens: number }[];
  top_users: {
    user_id: string;
    email: string;
    name: string | null;
    tier: string;
    cost: number;
    input_tokens: number;
    output_tokens: number;
    conversations: number;
  }[];
}

interface RealtimeData {
  today_cost_usd: number;
  today_input_tokens: number;
  today_output_tokens: number;
  active_users: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FEATURE_COLORS: Record<string, string> = {
  chat: '#3b82f6',
  briefing: '#8b5cf6',
  suggestions: '#06b6d4',
  event_parser: '#f59e0b',
  digest: '#10b981',
  ocr: '#ec4899',
  recipe_parse: '#f97316',
};

const TIER_COLORS: Record<string, string> = {
  pro: '#3b82f6',
  family: '#8b5cf6',
  free: '#6b7280',
};

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: 'month', label: '30 Days' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const CostCard = memo(function CostCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
});

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

function formatFeatureName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

/** Displays AI feature usage metrics and trends in the admin dashboard. */
export const AIUsagePanel = memo(function AIUsagePanel() {
  const [range, setRange] = useState('today');

  // Full usage data (refreshes on range change)
  const { data, isLoading } = useQuery<AIUsageData>({
    queryKey: ['admin-ai-usage', range],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/ai-usage?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch AI usage');
      return res.json();
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Realtime polling for today's running total (60s)
  const { data: realtime } = useQuery<RealtimeData>({
    queryKey: ['admin-ai-usage-realtime'],
    queryFn: async () => {
      const res = await adminFetch('/api/admin/ai-usage/realtime');
      if (!res.ok) throw new Error('Failed to fetch realtime');
      return res.json();
    },
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading AI usage data...</span>
      </div>
    );
  }

  const totals = data?.totals ?? { input_tokens: 0, output_tokens: 0, voice_seconds: 0, conversations: 0, tool_calls: 0, cost_usd: 0 };
  const todayCost = realtime?.today_cost_usd ?? totals.cost_usd;
  const activeUsers = realtime?.active_users ?? data?.active_users_today ?? 0;

  // Budget health: estimate % of expected revenue consumed
  // Assuming ~$18/user/mo for Pro, active users * $18 = expected revenue
  const expectedMonthlyRevenue = Math.max(activeUsers * 18, 1);
  const projectedMonthlyCost = todayCost * 30;
  const budgetHealthPct = Math.min(
    Math.round((projectedMonthlyCost / expectedMonthlyRevenue) * 100),
    100
  );

  return (
    <div className="space-y-6 overflow-y-auto">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          AI Cost & Usage
        </h3>
        <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                range === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CostCard
          title="Today's Cost"
          value={formatCost(todayCost)}
          subtitle={range !== 'today' ? `${range} total: ${formatCost(totals.cost_usd)}` : undefined}
          icon={DollarSign}
          color="bg-green-600"
        />
        <CostCard
          title="Active AI Users"
          value={activeUsers.toString()}
          subtitle="Today"
          icon={Users}
          color="bg-blue-600"
        />
        <CostCard
          title="Total Tokens"
          value={formatTokens(totals.input_tokens + totals.output_tokens)}
          subtitle={`In: ${formatTokens(totals.input_tokens)} / Out: ${formatTokens(totals.output_tokens)}`}
          icon={Zap}
          color="bg-purple-600"
        />
        <CostCard
          title="Budget Health"
          value={`${budgetHealthPct}%`}
          subtitle={`Projected: ${formatCost(projectedMonthlyCost)}/mo`}
          icon={budgetHealthPct > 50 ? AlertTriangle : TrendingUp}
          color={budgetHealthPct > 50 ? 'bg-amber-600' : 'bg-cyan-600'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost Trend Line Chart */}
        {(data?.daily_trend?.length ?? 0) > 1 && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Cost Trend
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data!.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#9CA3AF' }}
                  formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(4)}`, 'Cost']}
                />
                <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost by Feature Bar Chart */}
        {(data?.cost_by_feature?.length ?? 0) > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Cost by Feature
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data!.cost_by_feature}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="feature"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={formatFeatureName}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(4)}`, 'Cost']}
                  labelFormatter={(label) => formatFeatureName(String(label))}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {data!.cost_by_feature.map((entry) => (
                    <Cell key={entry.feature} fill={FEATURE_COLORS[entry.feature] ?? '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tier Breakdown + Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cost by Tier Pie Chart */}
        {(data?.cost_by_tier?.length ?? 0) > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-xs font-semibold text-gray-400 mb-3">Cost by Tier</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data!.cost_by_tier}
                  dataKey="cost"
                  nameKey="tier"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({ name, value }: { name?: string; value?: number }) =>
                    `${name ?? ''}: $${(value ?? 0).toFixed(3)}`
                  }
                >
                  {data!.cost_by_tier.map((entry) => (
                    <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(4)}`, 'Cost']}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Users Table */}
        <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <h4 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Top Users by Spend
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  <th className="text-left pb-2 font-medium">User</th>
                  <th className="text-left pb-2 font-medium">Tier</th>
                  <th className="text-right pb-2 font-medium">Cost</th>
                  <th className="text-right pb-2 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {(data?.top_users ?? []).slice(0, 10).map((user) => (
                  <tr key={user.user_id} className="border-b border-gray-700/30">
                    <td className="py-2 text-gray-300 truncate max-w-[150px]">
                      {user.name || user.email}
                    </td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        user.tier === 'family' ? 'bg-purple-500/20 text-purple-400' :
                        user.tier === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="py-2 text-right text-white font-medium">
                      {formatCost(user.cost)}
                    </td>
                    <td className="py-2 text-right text-gray-400">
                      {formatTokens(user.input_tokens + user.output_tokens)}
                    </td>
                  </tr>
                ))}
                {(data?.top_users?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      No AI usage data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Clock className="w-3 h-3" />
        <span>
          Auto-refreshes every 60s
          {realtime?.timestamp && ` · Last: ${new Date(realtime.timestamp).toLocaleTimeString()}`}
        </span>
      </div>
    </div>
  );
});
