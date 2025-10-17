'use client';

import { Check } from 'lucide-react';
import type { BudgetTemplate, HouseholdType } from '@/lib/services/budget-templates-service';

interface TemplateCardProps {
  template: BudgetTemplate;
  isSelected?: boolean;
  monthlyIncome?: number;
  onClick?: () => void;
  className?: string;
}

const householdLabels: Record<HouseholdType, string> = {
  single: 'Single',
  couple: 'Couple',
  family_small: 'Family (1-2 kids)',
  family_large: 'Family (3+ kids)',
  student: 'Student',
  retired: 'Retired',
};

export function TemplateCard({
  template,
  isSelected = false,
  monthlyIncome,
  onClick,
  className = '',
}: TemplateCardProps) {
  // Check if income is within recommended range
  const incomeInRange =
    !monthlyIncome ||
    ((!template.recommended_income_min ||
      monthlyIncome >= template.recommended_income_min) &&
      (!template.recommended_income_max ||
        monthlyIncome <= template.recommended_income_max));

  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
        isSelected
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md'
      } ${!isClickable ? 'cursor-default' : 'cursor-pointer'} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Icon */}
          <span className="text-3xl flex-shrink-0" aria-hidden="true">
            {template.icon}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title with selection indicator */}
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="truncate">{template.name}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-amber-600 flex-shrink-0" aria-label="Selected" />
              )}
            </h3>

            {/* Description */}
            {template.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {template.description}
              </p>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Household Type */}
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 font-medium">
                {householdLabels[template.household_type]}
              </span>

              {/* Income Range */}
              {template.recommended_income_min && template.recommended_income_max && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    incomeInRange
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  }`}
                >
                  ${template.recommended_income_min.toLocaleString()} - $
                  {template.recommended_income_max.toLocaleString()}/mo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
