'use client';

import { memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HeartPulse,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Clock,
  Activity,
  Database,
  Gauge,
  Server,
} from 'lucide-react';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  description: string;
  lastChecked: string;
}

interface PerformanceMetric {
  endpoint: string;
  avgResponseTime: number;
  errorRate: number;
  requestCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface HealthData {
  overall: 'healthy' | 'warning' | 'critical';
  metrics: HealthMetric[];
  uptime: string;
  version: string;
  environment: string;
  responseTime: string;
}

const StatusIcon = memo(function StatusIcon({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  if (status === 'healthy') {
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  }
  if (status === 'warning') {
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  }
  return <XCircle className="w-4 h-4 text-red-500" />;
});

const MetricIcon = memo(function MetricIcon({ name }: { name: string }) {
  if (name.includes('Database')) return <Database className="w-4 h-4" />;
  if (name.includes('Memory')) return <Gauge className="w-4 h-4" />;
  if (name.includes('API')) return <Server className="w-4 h-4" />;
  if (name.includes('Rate')) return <Activity className="w-4 h-4" />;
  return <HeartPulse className="w-4 h-4" />;
});

const statusColors = {
  healthy: 'bg-green-900/20 border-green-800',
  warning: 'bg-yellow-900/20 border-yellow-800',
  critical: 'bg-red-900/20 border-red-800',
};

const statusTextColors = {
  healthy: 'text-green-400',
  warning: 'text-yellow-400',
  critical: 'text-red-400',
};

/** Displays system health indicators and infrastructure status. */
export const HealthPanel = memo(function HealthPanel() {
  // React Query for health data with caching
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-health'],
    queryFn: async () => {
      const response = await fetch('/api/admin/health');
      if (!response.ok) throw new Error('Failed to fetch health data');
      const result = await response.json();
      return {
        health: result.health as HealthData,
        performance: result.performance as PerformanceMetric[],
      };
    },
    staleTime: 30 * 1000, // 30 seconds - health data should be fresh
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  const health = data?.health;
  const performance = data?.performance || [];

  const fetchData = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Checking system health...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-400">Unable to fetch health data</p>
        <button onClick={fetchData} className="mt-3 text-blue-600 hover:underline text-sm">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-auto">
      {/* Header with Overall Status */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${statusColors[health.overall]}`}>
          <StatusIcon status={health.overall} />
          <div>
            <span className={`text-sm font-semibold ${statusTextColors[health.overall]}`}>
              System {health.overall.charAt(0).toUpperCase() + health.overall.slice(1)}
            </span>
            <p className="text-xs text-gray-400">
              Response: {health.responseTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Uptime: {health.uptime}
            </div>
            <div>v{health.version} ({health.environment})</div>
          </div>
          <button
            onClick={fetchData}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {health.metrics.map((metric) => (
          <div
            key={metric.name}
            className={`p-3 rounded-lg border ${statusColors[metric.status]}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`flex items-center gap-2 ${statusTextColors[metric.status]}`}>
                <MetricIcon name={metric.name} />
                <span className="text-xs font-medium">{metric.name}</span>
              </div>
              <StatusIcon status={metric.status} />
            </div>
            <p className={`text-lg font-bold ${statusTextColors[metric.status]}`}>
              {metric.value}
            </p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      {/* Performance Metrics Table */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-white">API Performance</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Endpoint</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Avg Response</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Error Rate</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Requests</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {performance.map((metric) => (
                <tr key={metric.endpoint} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2 font-mono text-xs text-white">
                    {metric.endpoint}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400">
                    {metric.avgResponseTime}ms
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={metric.errorRate > 2 ? 'text-red-600' : metric.errorRate > 1 ? 'text-yellow-600' : 'text-green-600'}>
                      {metric.errorRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400">
                    {metric.requestCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <StatusIcon status={metric.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
