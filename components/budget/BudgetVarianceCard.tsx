'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calculator,
  Target,
  ArrowRight,
  Lightbulb,
  Edit3,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Project, ProjectLineItem } from '@/lib/services/project-tracking-service';

interface BudgetVarianceCardProps {
  project: Project;
  lineItems: ProjectLineItem[];
  onUpdateBudget?: (newBudget: number) => void;
}

export function BudgetVarianceCard({
  project,
  lineItems,
  onUpdateBudget
}: BudgetVarianceCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showBudgetAdjust, setShowBudgetAdjust] = useState(false);
  const [newBudget, setNewBudget] = useState(project.estimated_budget?.toString() || '');

  // Calculate detailed metrics
  const totalEstimated = lineItems.reduce((sum, item) => sum + item.estimated_cost, 0);
  const totalActual = lineItems.reduce((sum, item) => sum + item.actual_cost, 0);
  const totalPaid = lineItems.filter(item => item.is_paid).reduce((sum, item) => sum + item.actual_cost, 0);
  const totalUnpaid = lineItems.filter(item => !item.is_paid).reduce((sum, item) => sum + item.estimated_cost, 0);

  const variance = project.actual_cost - (project.estimated_budget || 0);
  const variancePercentage = project.estimated_budget ? (variance / project.estimated_budget) * 100 : 0;
  const isOverBudget = variance > 0;

  // Calculate projections
  const remainingWork = totalEstimated - totalActual;
  const projectedTotal = totalActual + remainingWork;
  const projectedVariance = projectedTotal - (project.estimated_budget || 0);

  // Category breakdown for over-budget items
  const categoryBreakdown = lineItems.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = { estimated: 0, actual: 0, count: 0 };
    }
    acc[category].estimated += item.estimated_cost;
    acc[category].actual += item.actual_cost;
    acc[category].count += 1;
    return acc;
  }, {} as Record<string, { estimated: number; actual: number; count: number }>);

  const overBudgetCategories = Object.entries(categoryBreakdown)
    .filter(([_, data]) => data.actual > data.estimated)
    .map(([category, data]) => ({
      category,
      variance: data.actual - data.estimated,
      percentage: data.estimated > 0 ? ((data.actual - data.estimated) / data.estimated) * 100 : 0,
      ...data,
    }))
    .sort((a, b) => b.variance - a.variance);

  // Chart data
  const budgetComparisonData = [
    {
      name: 'Budget vs Actual',
      estimated: project.estimated_budget || 0,
      actual: project.actual_cost,
      projected: projectedTotal,
    },
  ];

  const categoryChartData = overBudgetCategories.slice(0, 5).map((cat, index) => ({
    name: cat.category,
    variance: cat.variance,
    color: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'][index],
  }));

  const handleBudgetUpdate = () => {
    const budget = parseFloat(newBudget);
    if (budget > 0 && onUpdateBudget) {
      onUpdateBudget(budget);
      setShowBudgetAdjust(false);
    }
  };

  return (
    <div className={`border rounded-xl p-6 ${
      isOverBudget
        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
        : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${
            isOverBudget
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-orange-100 dark:bg-orange-900/30'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${
              isOverBudget
                ? 'text-red-600 dark:text-red-400'
                : 'text-orange-600 dark:text-orange-400'
            }`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${
              isOverBudget
                ? 'text-red-900 dark:text-red-100'
                : 'text-orange-900 dark:text-orange-100'
            }`}>
              Budget Variance Alert
            </h3>
            <p className={`text-sm ${
              isOverBudget
                ? 'text-red-700 dark:text-red-300'
                : 'text-orange-700 dark:text-orange-300'
            }`}>
              Project is ${Math.abs(variance).toLocaleString()} ({Math.abs(variancePercentage).toFixed(1)}%) {isOverBudget ? 'over' : 'approaching'} budget
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBudgetAdjust(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              isOverBudget
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Adjust Budget
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              isOverBudget
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            isOverBudget
              ? 'text-red-600 dark:text-red-400'
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            ${Math.abs(variance).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Variance</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${project.actual_cost.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Spent</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${projectedTotal.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Projected</div>
        </div>

        <div className="text-center">
          <div className={`text-2xl font-bold ${
            projectedVariance > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            {projectedVariance > 0 ? '+' : ''}${projectedVariance.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Final Variance</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className={`p-4 rounded-lg mb-4 ${
        isOverBudget
          ? 'bg-red-100 dark:bg-red-900/20'
          : 'bg-orange-100 dark:bg-orange-900/20'
      }`}>
        <div className="flex items-start gap-3">
          <Lightbulb className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isOverBudget
              ? 'text-red-600 dark:text-red-400'
              : 'text-orange-600 dark:text-orange-400'
          }`} />
          <div>
            <h4 className={`font-medium mb-2 ${
              isOverBudget
                ? 'text-red-900 dark:text-red-100'
                : 'text-orange-900 dark:text-orange-100'
            }`}>
              Recommended Actions
            </h4>
            <ul className={`space-y-1 text-sm ${
              isOverBudget
                ? 'text-red-800 dark:text-red-200'
                : 'text-orange-800 dark:text-orange-200'
            }`}>
              {isOverBudget ? (
                <>
                  <li>• Review and pause non-essential line items</li>
                  <li>• Negotiate with vendors for better pricing</li>
                  <li>• Consider scope reduction or phased completion</li>
                  {overBudgetCategories.length > 0 && (
                    <li>• Focus on controlling costs in {overBudgetCategories[0].category}</li>
                  )}
                </>
              ) : (
                <>
                  <li>• Monitor {overBudgetCategories.length > 0 ? overBudgetCategories[0].category : 'upcoming'} expenses closely</li>
                  <li>• Get multiple quotes for remaining work</li>
                  <li>• Consider budget reallocation between categories</li>
                  <li>• Set up cost approval workflows for large expenses</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      {showDetails && (
        <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          {/* Budget vs Actual Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Budget Comparison
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={budgetComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `$${value.toLocaleString()}`,
                      name === 'estimated' ? 'Budgeted' : name === 'actual' ? 'Spent' : 'Projected'
                    ]}
                  />
                  <Bar dataKey="estimated" fill="#10b981" name="Budgeted" />
                  <Bar dataKey="actual" fill="#f59e0b" name="Spent" />
                  <Bar dataKey="projected" fill="#ef4444" name="Projected" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Variances */}
            {overBudgetCategories.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                  Over-Budget Categories
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, variance }) => `${name}: $${variance.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="variance"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category Breakdown Table */}
          {overBudgetCategories.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Category Analysis
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Category</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Budgeted</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Actual</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Variance</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overBudgetCategories.map((category) => (
                      <tr key={category.category} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 text-sm text-gray-900 dark:text-white">
                          {category.category}
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            ({category.count} items)
                          </span>
                        </td>
                        <td className="py-2 text-sm text-right text-gray-900 dark:text-white">
                          ${category.estimated.toLocaleString()}
                        </td>
                        <td className="py-2 text-sm text-right text-gray-900 dark:text-white">
                          ${category.actual.toLocaleString()}
                        </td>
                        <td className="py-2 text-sm text-right text-red-600 dark:text-red-400 font-medium">
                          +${category.variance.toLocaleString()}
                        </td>
                        <td className="py-2 text-sm text-right text-red-600 dark:text-red-400 font-medium">
                          +{category.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Budget Adjustment Modal */}
      {showBudgetAdjust && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowBudgetAdjust(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Adjust Project Budget
                </h3>
                <button
                  onClick={() => setShowBudgetAdjust(false)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Budget
                  </label>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${project.estimated_budget?.toLocaleString() || 'Not set'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recommended Budget
                  </label>
                  <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    ${projectedTotal.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Based on current spending and remaining estimates
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Budget <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="100"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowBudgetAdjust(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBudgetUpdate}
                  disabled={!newBudget || parseFloat(newBudget) <= 0}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Budget
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}