'use client';

import { useState, useMemo } from 'react';
import { Filter, AlertCircle } from 'lucide-react';
import { TemplateCard } from './TemplateCard';
import type { BudgetTemplate, HouseholdType } from '@/lib/services/budget-templates-service';

interface TemplateGalleryProps {
  templates: BudgetTemplate[];
  selectedTemplateId?: string;
  monthlyIncome?: number;
  onTemplateSelect?: (template: BudgetTemplate) => void;
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

export function TemplateGallery({
  templates,
  selectedTemplateId,
  monthlyIncome,
  onTemplateSelect,
  className = '',
}: TemplateGalleryProps) {
  const [householdFilter, setHouseholdFilter] = useState<HouseholdType | 'all'>('all');
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);

  // Filter templates based on criteria
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Filter by household type
    if (householdFilter !== 'all') {
      filtered = filtered.filter((t) => t.household_type === householdFilter);
    }

    // Filter by recommended income range
    if (showOnlyRecommended && monthlyIncome) {
      filtered = filtered.filter(
        (t) =>
          (!t.recommended_income_min || monthlyIncome >= t.recommended_income_min) &&
          (!t.recommended_income_max || monthlyIncome <= t.recommended_income_max)
      );
    }

    // Sort by sort_order
    filtered.sort((a, b) => a.sort_order - b.sort_order);

    return filtered;
  }, [templates, householdFilter, showOnlyRecommended, monthlyIncome]);

  const hasActiveFilters = householdFilter !== 'all' || showOnlyRecommended;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Controls */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">
            Filter Templates
          </h3>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setHouseholdFilter('all');
                setShowOnlyRecommended(false);
              }}
              className="ml-auto text-xs text-amber-600 text-amber-400 hover:text-amber-300 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Household Type Filter */}
          <div>
            <label
              htmlFor="household-filter"
              className="block text-xs font-medium text-gray-400 mb-1"
            >
              Household Type
            </label>
            <select
              id="household-filter"
              value={householdFilter}
              onChange={(e) => setHouseholdFilter(e.target.value as HouseholdType | 'all')}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {Object.entries(householdLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Recommended Filter */}
          {monthlyIncome && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyRecommended}
                  onChange={(e) => setShowOnlyRecommended(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-300">
                  Show only recommended for my income
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'}{' '}
          {hasActiveFilters ? 'found' : 'available'}
        </span>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-700">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">
            No Templates Found
          </h3>
          <p className="text-gray-400 mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more options.'
              : 'No budget templates are currently available.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setHouseholdFilter('all');
                setShowOnlyRecommended(false);
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              monthlyIncome={monthlyIncome}
              onClick={onTemplateSelect ? () => onTemplateSelect(template) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
