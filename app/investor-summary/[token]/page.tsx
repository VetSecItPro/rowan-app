/**
 * Public Investor Summary Page
 * /investor-summary/[token]
 *
 * Server-rendered page that validates token and displays business metrics
 * No authentication required - token IS the auth
 */

import { Metadata } from 'next';
import { TrendingUp, Users, Activity, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Rowan Business Summary',
  description: 'Executive business metrics and performance dashboard',
  robots: 'noindex, nofollow',
};

interface BusinessMetrics {
  mrr: number;
  mrrGrowthPct: number;
  churnRate: number;
  dauMauRatio: number;
  nrr: number;
  totalUsers: number;
  activeUsers: number;
  dau: number;
  mau: number;
  userGrowthTrend: Array<{
    date: string;
    users: number;
    newUsers: number;
  }>;
}

async function fetchMetrics(token: string): Promise<{ metrics: BusinessMetrics; generatedAt: string } | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rowanapp.com';
    const response = await fetch(`${baseUrl}/api/investor-summary/${token}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      metrics: data.metrics,
      generatedAt: data.generatedAt,
    };
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return null;
  }
}

export default async function InvestorSummaryPage({ params }: PageProps) {
  const { token } = await params;
  const data = await fetchMetrics(token);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">
              This link has expired or is invalid. Please request a new link from your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, generatedAt } = data;
  const generatedDate = new Date(generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Rowan Business Summary</h1>
              <p className="text-sm text-gray-400 mt-1">Generated on {generatedDate}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Confidential</div>
              <div className="text-xs text-gray-400 mt-1">For Authorized Recipients Only</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Grid */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Key Business Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* MRR */}
            <MetricCard
              title="Monthly Recurring Revenue"
              value={`$${metrics.mrr.toLocaleString()}`}
              trend={metrics.mrrGrowthPct}
              trendLabel="vs previous period"
              icon={DollarSign}
              color="green"
            />

            {/* MRR Growth */}
            <MetricCard
              title="MRR Growth Rate"
              value={`${metrics.mrrGrowthPct}%`}
              icon={TrendingUp}
              color="blue"
            />

            {/* Churn Rate */}
            <MetricCard
              title="Churn Rate"
              value={`${metrics.churnRate}%`}
              trend={-metrics.churnRate}
              trendLabel="lower is better"
              icon={Activity}
              color="purple"
              invertTrend
            />

            {/* DAU/MAU */}
            <MetricCard
              title="DAU/MAU Ratio"
              value={`${metrics.dauMauRatio}%`}
              icon={Activity}
              color="cyan"
              subtitle="Daily engagement"
            />

            {/* NRR */}
            <MetricCard
              title="Net Revenue Retention"
              value={`${metrics.nrr}%`}
              icon={TrendingUp}
              color="green"
              subtitle="Cohort performance"
            />

            {/* Total Users */}
            <MetricCard
              title="Total Users"
              value={metrics.totalUsers.toLocaleString()}
              icon={Users}
              color="orange"
              subtitle={`${metrics.activeUsers.toLocaleString()} active (30d)`}
            />
          </div>
        </section>

        {/* User Growth */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">User Growth (Last 90 Days)</h2>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <StatBox label="Total Users" value={metrics.totalUsers.toLocaleString()} />
              <StatBox label="Active Users (30d)" value={metrics.activeUsers.toLocaleString()} />
              <StatBox label="Daily Active" value={metrics.dau.toLocaleString()} />
              <StatBox label="Monthly Active" value={metrics.mau.toLocaleString()} />
            </div>
            <div className="text-sm text-gray-400 text-center py-4">
              User growth visualization would appear here in production
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 pt-8 mt-12">
          <div className="text-center">
            <p className="text-sm text-gray-400">
              Generated by Rowan Analytics • Confidential
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This report contains confidential business information. Do not distribute without authorization.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  color,
  subtitle,
  invertTrend = false,
}: {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'cyan' | 'orange';
  subtitle?: string;
  invertTrend?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
  };

  const isPositive = trend !== undefined
    ? invertTrend
      ? trend < 0
      : trend >= 0
    : undefined;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      {trend !== undefined && isPositive !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-gray-400 ml-1">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

// Stat Box Component
function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
