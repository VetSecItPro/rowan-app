'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle, Target, Calendar } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  varianceAnalysisService,
  type MonthlyVariance,
  type BudgetVariance,
} from '@/lib/services/variance-analysis-service';

interface VarianceDashboardProps {
  spaceId: string;
}

export default function VarianceDashboard({ spaceId }: VarianceDashboardProps) {
  const [currentVariance, setCurrentVariance] = useState<MonthlyVariance | null>(null);
  const [projectedVariance, setProjectedVariance] = useState<MonthlyVariance | null>(null);
  const [problematicCategories, setProblematicCategories] = useState<BudgetVariance[]>([]);
  const [performingCategories, setPerformingCategories] = useState<BudgetVariance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVarianceData = useCallback(async () => {
    try {
      setLoading(true);

      const [current, projected, problematic, performing] = await Promise.all([
        varianceAnalysisService.getCurrentMonthVariance(spaceId),
        varianceAnalysisService.getProjectedMonthEndVariance(spaceId),
        varianceAnalysisService.getProblematicCategories(spaceId, 3),
        varianceAnalysisService.getPerformingCategories(spaceId),
      ]);

      setCurrentVariance(current);
      setProjectedVariance(projected);
      setProblematicCategories(problematic);
      setPerformingCategories(performing);
    } catch (error) {
      logger.error('Error loading variance data:', error, { component: 'VarianceDashboard', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadVarianceData();
  }, [loadVarianceData]);

  const getStatusColor = (color: BudgetVariance['color']) => {
    switch (color) {
      case 'green':
        return 'text-green-400 bg-green-900/20 border-green-800';
      case 'blue':
        return 'text-blue-400 bg-blue-900/20 border-blue-800';
      case 'yellow':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      case 'red':
        return 'text-red-400 bg-red-900/20 border-red-800';
    }
  };

  const getStatusIcon = (status: BudgetVariance['status']) => {
    switch (status) {
      case 'under':
        return <TrendingDown className="w-5 h-5" />;
      case 'on-track':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'over':
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status: BudgetVariance['status']) => {
    switch (status) {
      case 'under':
        return 'Under Budget';
      case 'on-track':
        return 'On Track';
      case 'warning':
        return 'Warning';
      case 'over':
        return 'Over Budget';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        Loading variance analysis...
      </div>
    );
  }

  if (!currentVariance) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No budget data available for analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Month */}
        <div className="bg-gray-800 rounded-xl border-2 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Current Month
            </h3>
            <span className="text-sm text-gray-400">{currentVariance.month}</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-400">Budgeted:</span>
              <span className="text-lg font-semibold text-white">
                ${currentVariance.total_budgeted.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-400">Actual:</span>
              <span className="text-lg font-semibold text-white">
                ${currentVariance.total_actual.toLocaleString()}
              </span>
            </div>

            <div className="border-t border-gray-700 pt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-gray-300">Variance:</span>
                <span
                  className={`text-xl font-bold ${
                    currentVariance.total_variance < 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {currentVariance.total_variance < 0 ? '-' : '+'}$
                  {Math.abs(currentVariance.total_variance).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 text-center">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    currentVariance.variance_percentage < 0
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {currentVariance.variance_percentage < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                  {Math.abs(currentVariance.variance_percentage).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Projected End of Month */}
        {projectedVariance && (
          <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-2 border-indigo-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5" />
                Projected
              </h3>
              <span className="text-sm text-indigo-400">End of Month</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Projected Spending:</span>
                <span className="text-lg font-semibold text-white">
                  ${projectedVariance.total_actual.toLocaleString()}
                </span>
              </div>

              <div className="border-t border-indigo-800 pt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-gray-300">
                    Projected Variance:
                  </span>
                  <span
                    className={`text-xl font-bold ${
                      projectedVariance.total_variance < 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {projectedVariance.total_variance < 0 ? '-' : '+'}$
                    {Math.abs(projectedVariance.total_variance).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      projectedVariance.variance_percentage < 0
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-red-900/30 text-red-400'
                    }`}
                  >
                    {projectedVariance.variance_percentage < 0 ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    {Math.abs(projectedVariance.variance_percentage).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          Category Breakdown
        </h3>

        <div className="space-y-3">
          {currentVariance.categories.map((category) => (
            <div
              key={category.category}
              className={`p-4 rounded-lg border-2 ${getStatusColor(category.color)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(category.status)}
                  <h4 className="font-semibold">{category.category}</h4>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-black/20">
                  {getStatusLabel(category.status)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs opacity-75">Budgeted</p>
                  <p className="font-semibold">${category.budgeted_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">Actual</p>
                  <p className="font-semibold">${category.actual_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">Variance</p>
                  <p className="font-bold">
                    {category.variance < 0 ? '-' : '+'}${Math.abs(category.variance).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-2 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-current transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (category.actual_amount / category.budgeted_amount) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Problematic Categories */}
        {problematicCategories.length > 0 && (
          <div className="bg-red-900/20 border-2 border-red-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-100 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Needs Attention
            </h3>
            <div className="space-y-2">
              {problematicCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <span className="font-medium text-white">{cat.category}</span>
                  <span className="text-sm font-semibold text-red-400">
                    +{Math.abs(cat.variance_percentage).toFixed(0)}% over
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performing Categories */}
        {performingCategories.length > 0 && (
          <div className="bg-green-900/20 border-2 border-green-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-green-100 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Doing Great
            </h3>
            <div className="space-y-2">
              {performingCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <span className="font-medium text-white">{cat.category}</span>
                  <span className="text-sm font-semibold text-green-400">
                    {Math.abs(cat.variance_percentage).toFixed(0)}% under
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
