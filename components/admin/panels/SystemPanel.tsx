'use client';

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import { HeartPulse, Download, Gauge, Target, AlertTriangle, Clock, Activity, Info, Database, TrendingUp } from 'lucide-react';
import { HealthPanel } from './HealthPanel';
import { ExportPanel } from './ExportPanel';

type SubTab = 'health' | 'export' | 'performance' | 'database' | 'goals';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'export', label: 'Export', icon: Download },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'goals', label: 'Goals', icon: Target },
];

// ---------------------------------------------------------------------------
// Performance Panel
// ---------------------------------------------------------------------------

interface SentryStatsData {
  configured: boolean;
  errorCounts?: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

interface PerformanceMetricsData {
  configured: boolean;
  source?: 'vercel' | 'health' | 'placeholder';
  metrics?: {
    p50: number;
    p95: number;
    p99: number;
  };
}

const PerformancePanel = memo(function PerformancePanel() {
  const { data: sentryData, isLoading: sentryLoading } = useQuery<SentryStatsData>({
    queryKey: ['admin-sentry-stats'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/sentry-stats');
      if (!response.ok) throw new Error('Failed to fetch Sentry stats');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: perfData, isLoading: perfLoading } = useQuery<PerformanceMetricsData>({
    queryKey: ['admin-performance-metrics'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/performance-metrics');
      if (!response.ok) throw new Error('Failed to fetch performance metrics');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (sentryLoading || perfLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading performance data...</span>
      </div>
    );
  }

  const p50 = perfData?.metrics?.p50 ?? 0;
  const p95 = perfData?.metrics?.p95 ?? 0;
  const p99 = perfData?.metrics?.p99 ?? 0;

  const errors24h = sentryData?.errorCounts?.last24h ?? 0;
  const errors7d = sentryData?.errorCounts?.last7d ?? 0;
  const errors30d = sentryData?.errorCounts?.last30d ?? 0;

  return (
    <div className="space-y-6">
      {/* API Response Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-400">P50 Response Time</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {perfData?.configured && p50 > 0 ? `${p50}ms` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {perfData?.configured ? `Source: ${perfData.source}` : 'Not configured'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-400">P95 Response Time</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {perfData?.configured && p95 > 0 ? `${p95}ms` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">95th percentile</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-400">P99 Response Time</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {perfData?.configured && p99 > 0 ? `${p99}ms` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">99th percentile</p>
        </div>
      </div>

      {/* Error Rate from Sentry */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Error Rate (Sentry)</h3>
        </div>
        {sentryData?.configured ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Last 24 Hours</div>
              <div className="text-2xl font-bold text-white">{errors24h.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">errors</div>
            </div>
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Last 7 Days</div>
              <div className="text-2xl font-bold text-white">{errors7d.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">errors</div>
            </div>
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Last 30 Days</div>
              <div className="text-2xl font-bold text-white">{errors30d.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">errors</div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-orange-900/20 rounded-lg">
            <p className="text-sm text-orange-300">
              Sentry integration not configured. Set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT
              environment variables to enable error rate tracking.
            </p>
          </div>
        )}
      </div>

      {/* Performance Note */}
      {perfData?.configured && perfData.source !== 'vercel' && (
        <div className="p-4 bg-gray-700/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-400">
              Performance metrics calculated from health endpoint sampling. For more accurate data,
              configure Vercel Analytics API with VERCEL_API_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Database Growth Panel
// ---------------------------------------------------------------------------

interface DatabaseGrowthData {
  tables: Array<{
    schema: string;
    tableName: string;
    rowCount: number;
  }>;
  totalSize: string;
}

const DatabaseGrowthPanel = memo(function DatabaseGrowthPanel() {
  const { data, isLoading } = useQuery<DatabaseGrowthData>({
    queryKey: ['admin-database-growth'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/database-growth');
      if (!response.ok) throw new Error('Failed to fetch database growth');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading database growth data...</span>
      </div>
    );
  }

  const tables = data?.tables || [];
  const totalSize = data?.totalSize || 'N/A';
  const totalRows = tables.reduce((sum, table) => sum + table.rowCount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-400">Total Database Size</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalSize}</p>
          <p className="text-xs text-gray-400 mt-1">Current disk usage</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-400">Total Rows</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalRows.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Across all tables</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-400">Table Count</span>
          </div>
          <p className="text-3xl font-bold text-white">{tables.length}</p>
          <p className="text-xs text-gray-400 mt-1">Public schema</p>
        </div>
      </div>

      {/* Tables List */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-white">Table Row Counts</h3>
        </div>
        {tables.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">Table Name</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3">Row Count</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table, index) => {
                  const percentage = totalRows > 0 ? ((table.rowCount / totalRows) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={index} className="border-b border-gray-700/50 last:border-0">
                      <td className="py-3 text-sm text-white">{table.tableName}</td>
                      <td className="py-3 text-sm text-gray-300 text-right font-mono">
                        {table.rowCount.toLocaleString()}
                      </td>
                      <td className="py-3 text-sm text-gray-400 text-right">
                        {percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <p className="text-sm text-gray-400">No table data available</p>
          </div>
        )}
      </div>

      {/* Growth Note */}
      <div className="p-4 bg-gray-700/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-400">
            Database metrics are refreshed every 5 minutes. Row counts are approximate (n_live_tup from pg_stat_user_tables).
            For exact counts, run ANALYZE on tables periodically.
          </p>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Goals Panel (OKR Tracking)
// ---------------------------------------------------------------------------

interface AdminGoal {
  id: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  notes: string | null;
}

const GoalsPanel = memo(function GoalsPanel() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    metric_name: '',
    target_value: '',
    current_value: '0',
    unit: 'users' as 'users' | 'currency' | 'percentage' | 'number',
    deadline: '',
    notes: '',
  });

  const { data: goalsResponse, isLoading, refetch } = useQuery<{ goals: AdminGoal[] }>({
    queryKey: ['admin-goals'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/goals');
      if (!response.ok) throw new Error('Failed to fetch goals');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const goals = goalsResponse?.goals || [];

  const handleCreateGoal = async () => {
    try {
      const response = await adminFetch('/api/admin/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_name: formData.metric_name,
          target_value: parseFloat(formData.target_value),
          current_value: parseFloat(formData.current_value),
          unit: formData.unit,
          deadline: formData.deadline || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create goal');

      setShowCreateForm(false);
      setFormData({
        metric_name: '',
        target_value: '',
        current_value: '0',
        unit: 'users',
        deadline: '',
        notes: '',
      });
      refetch();
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const response = await adminFetch('/api/admin/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId }),
      });

      if (!response.ok) throw new Error('Failed to delete goal');

      refetch();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const getProgressPct = (current: number, target: number, unit: string) => {
    if (unit === 'percentage') {
      if (target > 0 && current > 0) {
        const progress = Math.max(0, 100 - ((current / target) * 100 - 100));
        return Math.min(progress, 100);
      }
      return current <= target ? 100 : Math.round((target / Math.max(current, 1)) * 100);
    }
    return Math.min(Math.round((current / Math.max(target, 1)) * 100), 100);
  };

  const getStatus = (progressPct: number, unit: string, current: number, target: number) => {
    if (unit === 'percentage') {
      if (current <= target) return { label: 'On Track', color: 'text-green-400', bg: 'bg-green-500/20' };
      if (current <= target * 1.5) return { label: 'Behind', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
      return { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
    if (progressPct >= 70) return { label: 'On Track', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (progressPct >= 40) return { label: 'Behind', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'currency') return `$${value.toLocaleString()}`;
    if (unit === 'percentage') return `${value}%`;
    return value.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading goals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Goal Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">OKR Goals</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ Create Goal'}
        </button>
      </div>

      {/* Create Goal Form */}
      {showCreateForm && (
        <div className="bg-gray-800 rounded-lg p-5 space-y-4">
          <h4 className="text-sm font-semibold text-white">New Goal</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Goal Name</label>
              <input
                type="text"
                value={formData.metric_name}
                onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                placeholder="e.g., 1,000 MAU"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as typeof formData.unit })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="users">Users</option>
                <option value="currency">Currency</option>
                <option value="percentage">Percentage</option>
                <option value="number">Number</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Value</label>
              <input
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                placeholder="1000"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Current Value</label>
              <input
                type="number"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={handleCreateGoal}
            disabled={!formData.metric_name || !formData.target_value}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Goal
          </button>
        </div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="p-8 bg-gray-800 rounded-lg text-center">
          <p className="text-gray-400 text-sm">No goals set yet. Create your first OKR to track progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const progressPct = getProgressPct(goal.current_value, goal.target_value, goal.unit);
            const status = getStatus(progressPct, goal.unit, goal.current_value, goal.target_value);

            return (
              <div key={goal.id} className="bg-gray-800 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">{goal.metric_name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${status.bg} ${status.color} font-medium`}>
                    {status.label}
                  </span>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400">Current</p>
                    <p className="text-xl font-bold text-white">{formatValue(goal.current_value, goal.unit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Target</p>
                    <p className="text-sm font-medium text-gray-300">{formatValue(goal.target_value, goal.unit)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      status.label === 'On Track' ? 'bg-green-500' :
                      status.label === 'Behind' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(progressPct, 2)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{progressPct}% complete</span>
                  {goal.deadline && (
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                      {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-700">
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Setting Tips */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">OKR Best Practices</h3>
        <div className="space-y-3">
          <div className="p-3 bg-green-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-green-300">Set 3-5 Goals per Quarter</h4>
            <p className="text-xs text-green-400 mt-1">
              Focus on the metrics that matter most. Too many goals dilute effort.
            </p>
          </div>
          <div className="p-3 bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-300">70% Achievement is Healthy</h4>
            <p className="text-xs text-blue-400 mt-1">
              Stretch goals should be ambitious. Hitting 70% means the targets were set correctly.
            </p>
          </div>
          <div className="p-3 bg-purple-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-purple-300">Review Monthly</h4>
            <p className="text-xs text-purple-400 mt-1">
              Check progress monthly and adjust tactics. Goals stay fixed; approach adapts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/** Renders system configuration and platform settings in the admin dashboard. */
export const SystemPanel = memo(function SystemPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('health');

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-700">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-gray-300 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      <div className="flex-1 overflow-auto">
        {activeSubTab === 'health' && <HealthPanel />}
        {activeSubTab === 'export' && <ExportPanel />}
        {activeSubTab === 'performance' && <PerformancePanel />}
        {activeSubTab === 'database' && <DatabaseGrowthPanel />}
        {activeSubTab === 'goals' && <GoalsPanel />}
      </div>
    </div>
  );
});
