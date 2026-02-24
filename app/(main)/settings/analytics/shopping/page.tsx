'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ShoppingCart, CheckCircle, Package, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { shoppingService } from '@/lib/services/shopping-service';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { logger } from '@/lib/logger';
import Link from 'next/link';

interface ShoppingStatsData {
  totalLists: number;
  activeLists: number;
  itemsThisWeek: number;
  completedLists: number;
}

export default function ShoppingAnalyticsPage() {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [stats, setStats] = useState<ShoppingStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!spaceId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await shoppingService.getShoppingStats(spaceId);
        setStats(data);
      } catch (err) {
        logger.error('Failed to load shopping stats:', err, { component: 'page', action: 'execution' });
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [spaceId]);

  if (!spaceId) {
    return <SpacesLoadingState />;
  }

  const hasData = stats && stats.totalLists > 0;
  const completionRate = hasData && stats.totalLists > 0
    ? ((stats.completedLists / stats.totalLists) * 100).toFixed(1)
    : '0';

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Shopping Lists' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-400 mb-2">
              Shopping Lists Analytics
            </h1>
            <p className="text-gray-400">
              Analyze shopping patterns and list completion
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !hasData ? (
          <div className="text-center py-16">
            <ShoppingCart className="mx-auto h-16 w-16 text-emerald-400/40 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No data yet</h2>
            <p className="text-gray-400 mb-6">
              Start using Shopping Lists to see analytics here
            </p>
            <Link
              href="/shopping"
              className="inline-flex items-center px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Go to Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.totalLists}</h3>
                <p className="text-sm text-gray-400">Total Lists</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-400">
                    {stats.activeLists} active
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.itemsThisWeek}</h3>
                <p className="text-sm text-gray-400">Items This Week</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-400">
                    +{stats.completedLists}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.completedLists}</h3>
                <p className="text-sm text-gray-400">Completed Lists</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{completionRate}%</h3>
                <p className="text-sm text-gray-400">Completion Rate</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 border border-emerald-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-emerald-100 mb-4">Shopping Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{stats.totalLists}</p>
                  <p className="text-sm text-emerald-300">Total Lists</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.activeLists}</p>
                  <p className="text-sm text-blue-300">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{stats.completedLists}</p>
                  <p className="text-sm text-green-300">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{stats.itemsThisWeek}</p>
                  <p className="text-sm text-purple-300">Items This Week</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </FeatureLayout>
  );
}
