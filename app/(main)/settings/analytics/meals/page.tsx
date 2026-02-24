'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { UtensilsCrossed, Heart, Calendar, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { mealsService } from '@/lib/services/meals-service';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { logger } from '@/lib/logger';
import Link from 'next/link';

interface MealStatsData {
  thisWeek: number;
  nextWeek: number;
  savedRecipes: number;
  shoppingItems: number;
}

export default function MealsAnalyticsPage() {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [stats, setStats] = useState<MealStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!spaceId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await mealsService.getMealStats(spaceId);
        setStats(data);
      } catch (err) {
        logger.error('Failed to load meal stats:', err, { component: 'page', action: 'execution' });
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

  const hasData = stats && (stats.thisWeek > 0 || stats.savedRecipes > 0);

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Meal Planning' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-orange-400 mb-2">
              Meal Planning Analytics
            </h1>
            <p className="text-gray-400">
              Track meal planning habits and recipe usage
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !hasData ? (
          <div className="text-center py-16">
            <UtensilsCrossed className="mx-auto h-16 w-16 text-orange-400/40 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No data yet</h2>
            <p className="text-gray-400 mb-6">
              Start using Meal Planning to see analytics here
            </p>
            <Link
              href="/meals"
              className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Go to Meals
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                    <UtensilsCrossed className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.thisWeek}</h3>
                <p className="text-sm text-gray-400">Meals This Week</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.nextWeek}</h3>
                <p className="text-sm text-gray-400">Planned Next Week</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.savedRecipes}</h3>
                <p className="text-sm text-gray-400">Saved Recipes</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.shoppingItems}</h3>
                <p className="text-sm text-gray-400">Shopping Items</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-orange-900/20 to-amber-900/20 border border-orange-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-orange-100 mb-4">Meal Planning Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-400">{stats.thisWeek}</p>
                  <p className="text-sm text-orange-300">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.nextWeek}</p>
                  <p className="text-sm text-blue-300">Next Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-pink-400">{stats.savedRecipes}</p>
                  <p className="text-sm text-pink-300">Recipes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{stats.shoppingItems}</p>
                  <p className="text-sm text-green-300">Shopping Items</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </FeatureLayout>
  );
}
