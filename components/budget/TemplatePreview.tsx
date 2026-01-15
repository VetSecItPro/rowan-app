'use client';

import { TrendingUp, Info, AlertTriangle } from 'lucide-react';
import type { BudgetTemplateCategory } from '@/lib/services/budget-templates-service';

interface CategoryWithCalculation extends BudgetTemplateCategory {
  calculated_amount: number;
}

interface TemplatePreviewProps {
  categories: BudgetTemplateCategory[];
  monthlyIncome: number;
  className?: string;
}

export function TemplatePreview({
  categories,
  monthlyIncome,
  className = '',
}: TemplatePreviewProps) {
  // Calculate amounts for each category
  const categoriesWithAmounts: CategoryWithCalculation[] = categories.map((category) => ({
    ...category,
    calculated_amount: Math.round(((monthlyIncome * category.percentage) / 100) * 100) / 100,
  }));

  // Calculate totals
  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);
  const totalAllocated = categoriesWithAmounts.reduce(
    (sum, cat) => sum + cat.calculated_amount,
    0
  );
  const remaining = monthlyIncome - totalAllocated;

  // Check if allocation is valid (should be <= 100%)
  const isOverAllocated = totalPercentage > 100;
  const isUnderAllocated = totalPercentage < 100;

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-white">Budget Preview</h3>
      </div>

      {/* Total Budget Summary */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Total Monthly Income</span>
          <span className="text-2xl font-bold text-amber-600">
            ${monthlyIncome.toLocaleString()}
          </span>
        </div>

        {/* Allocation Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total Allocated</span>
            <span
              className={`font-medium ${
                isOverAllocated
                  ? 'text-red-400'
                  : 'text-white'
              }`}
            >
              ${totalAllocated.toLocaleString()} ({totalPercentage}%)
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Remaining</span>
            <span
              className={`font-medium ${
                remaining < 0
                  ? 'text-red-400'
                  : remaining > 0
                  ? 'text-green-400'
                  : 'text-white'
              }`}
            >
              ${Math.abs(remaining).toLocaleString()}
              {remaining < 0 && ' over budget'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isOverAllocated ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(totalPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Warnings */}
      {isOverAllocated && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">
            <strong>Warning:</strong> This budget allocates more than 100% of your income. You'll
            need to adjust the categories.
          </div>
        </div>
      )}

      {isUnderAllocated && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            You have ${remaining.toLocaleString()} ({100 - totalPercentage}%) unallocated. Consider
            allocating to savings or other categories.
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {categoriesWithAmounts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No categories defined for this template</p>
          </div>
        ) : (
          categoriesWithAmounts.map((category) => (
            <div
              key={category.id}
              className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {category.icon && (
                    <span className="text-lg flex-shrink-0" aria-hidden="true">
                      {category.icon}
                    </span>
                  )}
                  <span className="font-medium text-white text-sm truncate">
                    {category.category_name}
                  </span>
                </div>
                <span className="font-bold text-white flex-shrink-0 ml-2">
                  ${category.calculated_amount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                {category.description && (
                  <span className="text-xs text-gray-400 truncate flex-1 mr-2">
                    {category.description}
                  </span>
                )}
                <span className="text-xs font-medium text-amber-600 flex-shrink-0">
                  {category.percentage}%
                </span>
              </div>

              {/* Visual percentage bar */}
              <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
