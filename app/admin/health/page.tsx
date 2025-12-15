'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, LayoutDashboard } from 'lucide-react';
import { logger } from '@/lib/logger';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  description: string;
  lastChecked: string;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  metrics: HealthMetric[];
  uptime: string;
  version: string;
  environment: string;
}

interface PerformanceMetric {
  endpoint: string;
  avgResponseTime: number;
  errorRate: number;
  requestCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

// Status indicator component
const StatusIndicator = ({ status }: { status: 'healthy' | 'warning' | 'critical' }) => {
  const colors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <div className={`w-3 h-3 rounded-full ${colors[status]} animate-pulse`} />
  );
};

// Health metric card component
const HealthMetricCard = ({ metric }: { metric: HealthMetric }) => (
  <Card>
    <CardContent className="px-6 pt-6 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{metric.name}</h3>
        <StatusIndicator status={metric.status} />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {metric.value}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {metric.description}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        Last checked: {new Date(metric.lastChecked).toLocaleString()}
      </p>
    </CardContent>
  </Card>
);

// Performance metric component
const PerformanceMetricRow = ({ metric }: { metric: PerformanceMetric }) => (
  <tr className="border-b border-gray-200 dark:border-gray-700">
    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
      {metric.endpoint}
    </td>
    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
      {metric.avgResponseTime}ms
    </td>
    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
      {metric.errorRate.toFixed(2)}%
    </td>
    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
      {metric.requestCount.toLocaleString()}
    </td>
    <td className="py-3 px-4">
      <StatusIndicator status={metric.status} />
    </td>
  </tr>
);

export default function SystemHealthPage() {
  const router = useRouter();
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Auto-refresh interval (30 seconds)
  const REFRESH_INTERVAL = 30000;

  const fetchHealthData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/health');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch health data');
      }

      setHealthData(data.health);
      setPerformanceData(data.performance || []);
      setLastRefresh(new Date());
    } catch (err) {
      logger.error('Failed to fetch health data:', err, { component: 'page', action: 'execution' });
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    // Set up auto-refresh
    const interval = setInterval(fetchHealthData, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setLoading(true);
    fetchHealthData();
  };

  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading system health...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  System Health Check Failed
                </h2>
              </div>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Retry Health Check
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const overallStatusColor = {
    healthy: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    critical: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Admin Dashboard</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-gray-100 font-medium">System Health</span>
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                System Health Monitor
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Real-time system status and performance monitoring
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={refreshData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        {healthData && (
          <Card className="mb-8">
            <CardContent className="px-6 pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <StatusIndicator status={healthData.overall} />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      System Status: <span className={overallStatusColor[healthData.overall]}>
                        {healthData.overall.charAt(0).toUpperCase() + healthData.overall.slice(1)}
                      </span>
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Uptime: {healthData.uptime} | Version: {healthData.version} | Environment: {healthData.environment}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Auto-refresh: {REFRESH_INTERVAL / 1000}s
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Health Metrics Grid */}
        {healthData && healthData.metrics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {healthData.metrics.map((metric, index) => (
              <HealthMetricCard key={index} metric={metric} />
            ))}
          </div>
        )}

        {/* Performance Metrics */}
        {performanceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>API Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        Endpoint
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        Avg Response Time
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        Error Rate
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        Request Count
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((metric, index) => (
                      <PerformanceMetricRow key={index} metric={metric} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact Info */}
        <Card className="mt-8 border-yellow-200 dark:border-yellow-800">
          <CardContent className="px-6 pt-6 pb-6">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-3"></div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                System Alert Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-yellow-800 dark:text-yellow-200 mb-2">
                  <strong>Error Tracking:</strong> Issues are automatically logged to Sentry for debugging
                </p>
                <p className="text-yellow-800 dark:text-yellow-200">
                  <strong>Rate Limiting:</strong> Monitored via Upstash Redis with auto-scaling
                </p>
              </div>
              <div>
                <p className="text-yellow-800 dark:text-yellow-200 mb-2">
                  <strong>Database:</strong> Supabase connection health monitored continuously
                </p>
                <p className="text-yellow-800 dark:text-yellow-200">
                  <strong>Alerts:</strong> Automatic notifications if response times &gt; 2s or error rates &gt; 5%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}