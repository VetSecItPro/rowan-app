'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FolderOpen, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { getProjectStats } from '@/lib/services/project-tracking-service';
import { logger } from '@/lib/logger';

type ProjectStats = {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_estimated_budget: number;
  total_actual_cost: number;
  total_variance: number;
  projects_over_budget: number;
  projects_under_budget: number;
  avg_variance_percentage: number;
};

interface ProjectStatsProps {
  spaceId: string;
}

export default function ProjectStatsComponent({ spaceId }: ProjectStatsProps) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProjectStats(spaceId);
        setStats(data);
      } catch (err) {
        logger.error('Error loading project stats:', err, { component: 'ProjectStats', action: 'component_action' });
        setError('Failed to load project statistics');
      } finally {
        setLoading(false);
      }
    };

    if (spaceId) {
      loadStats();
    }
  }, [spaceId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
        <p className="text-red-400 text-sm">{error || 'Failed to load statistics'}</p>
      </div>
    );
  }

  const budgetUtilization = stats.total_estimated_budget > 0
    ? (stats.total_actual_cost / stats.total_estimated_budget) * 100
    : 0;

  const isOverBudgetOverall = stats.total_variance < 0;

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-100 text-sm font-medium">Total Projects</p>
            <FolderOpen className="w-5 h-5 text-amber-100" />
          </div>
          <p className="text-3xl font-bold">{stats.total_projects}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-amber-100">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stats.active_projects} active
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {stats.completed_projects} done
            </span>
          </div>
        </div>

        {/* Total Budget */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm font-medium">Total Budget</p>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            ${stats.total_estimated_budget.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Estimated across all projects
          </p>
        </div>

        {/* Actual Cost */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm font-medium">Actual Cost</p>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            ${stats.total_actual_cost.toLocaleString()}
          </p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Budget Used</span>
              <span className="font-medium text-white">
                {budgetUtilization.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isOverBudgetOverall ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-amber-600'
                }`}
                style={{ width: `${Math.min(100, budgetUtilization)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Variance */}
        <div className={`rounded-xl p-6 ${
          isOverBudgetOverall
            ? 'bg-red-900/20 border border-red-800'
            : 'bg-green-900/20 border border-green-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-medium ${
              isOverBudgetOverall ? 'text-red-400' : 'text-green-400'
            }`}>
              Budget Variance
            </p>
            {isOverBudgetOverall ? (
              <TrendingDown className="w-5 h-5 text-red-500" />
            ) : (
              <TrendingUp className="w-5 h-5 text-green-500" />
            )}
          </div>
          <p className={`text-3xl font-bold ${
            isOverBudgetOverall ? 'text-red-400' : 'text-green-400'
          }`}>
            {isOverBudgetOverall ? '-' : '+'}${Math.abs(stats.total_variance).toLocaleString()}
          </p>
          <p className="text-xs mt-3">
            <span className={isOverBudgetOverall ? 'text-red-400' : 'text-green-400'}>
              {isOverBudgetOverall ? 'Over' : 'Under'} budget by {Math.abs(stats.avg_variance_percentage).toFixed(1)}%
            </span>
          </p>
        </div>
      </div>

      {/* Budget Performance Summary */}
      {(stats.projects_over_budget > 0 || stats.projects_under_budget > 0) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Budget Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.projects_over_budget > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-900/20">
                <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">
                    {stats.projects_over_budget}
                  </p>
                  <p className="text-xs text-red-400">Over Budget</p>
                </div>
              </div>
            )}

            {stats.projects_under_budget > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-900/20">
                <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {stats.projects_under_budget}
                  </p>
                  <p className="text-xs text-green-400">Under Budget</p>
                </div>
              </div>
            )}

            {stats.active_projects > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-900/20">
                <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">
                    {stats.active_projects}
                  </p>
                  <p className="text-xs text-blue-400">In Progress</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.total_projects === 0 && (
        <div className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-sm text-gray-400">
            Create your first project to start tracking costs and budgets
          </p>
        </div>
      )}
    </div>
  );
}
