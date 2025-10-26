'use client';

import { Scale, Percent, DollarSign, TrendingUp } from 'lucide-react';
import type { SplitType } from '@/lib/validations/expense-splitting';

interface SplitTypeSelectorProps {
  selectedType: SplitType;
  onSelect: (type: SplitType) => void;
  disabled?: boolean;
  className?: string;
}

interface SplitTypeOption {
  type: SplitType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const splitTypeOptions: SplitTypeOption[] = [
  {
    type: 'equal',
    label: 'Equal Split',
    description: '50/50 split between partners',
    icon: <Scale className="w-5 h-5" />,
    color: 'emerald',
  },
  {
    type: 'percentage',
    label: 'Percentage',
    description: 'Custom percentage for each partner',
    icon: <Percent className="w-5 h-5" />,
    color: 'blue',
  },
  {
    type: 'fixed',
    label: 'Fixed Amount',
    description: 'Specific dollar amounts for each',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'amber',
  },
  {
    type: 'income-based',
    label: 'Income-Based',
    description: 'Split proportional to incomes',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'purple',
  },
];

export function SplitTypeSelector({
  selectedType,
  onSelect,
  disabled = false,
  className = '',
}: SplitTypeSelectorProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${className}`}>
      {splitTypeOptions.map((option) => {
        const isSelected = selectedType === option.type;
        const colorMap = {
          emerald: {
            border: 'border-emerald-500 dark:border-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            icon: 'text-emerald-600 dark:text-emerald-400',
            ring: 'ring-emerald-500',
          },
          blue: {
            border: 'border-blue-500 dark:border-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            icon: 'text-blue-600 dark:text-blue-400',
            ring: 'ring-blue-500',
          },
          amber: {
            border: 'border-amber-500 dark:border-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            icon: 'text-amber-600 dark:text-amber-400',
            ring: 'ring-amber-500',
          },
          purple: {
            border: 'border-purple-500 dark:border-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            icon: 'text-purple-600 dark:text-purple-400',
            ring: 'ring-purple-500',
          },
        };
        const colorClasses = colorMap[option.color as keyof typeof colorMap] || colorMap.emerald;

        return (
          <button
            key={option.type}
            type="button"
            onClick={() => !disabled && onSelect(option.type)}
            disabled={disabled}
            className={`
              btn-touch p-4 rounded-lg border-2 text-left transition-all
              ${
                isSelected
                  ? `${colorClasses.border} ${colorClasses.bg} ring-2 ${colorClasses.ring} hover:shadow-lg`
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98] hover-lift shimmer-emerald active-press'}
              focus:outline-none focus:ring-2 ${colorClasses.ring}
            `}
            aria-pressed={isSelected}
            aria-label={`${option.label}: ${option.description}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                flex-shrink-0 p-2 rounded-lg
                ${isSelected ? colorClasses.bg : 'bg-gray-100 dark:bg-gray-700'}
              `}
              >
                <span className={isSelected ? colorClasses.icon : 'text-gray-600 dark:text-gray-400'}>
                  {option.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-semibold mb-1 ${
                    isSelected
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                  {isSelected && (
                    <span className="ml-2 text-xs font-normal text-gray-600 dark:text-gray-400">
                      (Selected)
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
