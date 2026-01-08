'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Users, TrendingUp, Info, Check, ChevronDown } from 'lucide-react';
import { logger } from '@/lib/logger';
import type {
  BudgetTemplate,
  BudgetTemplateCategory,
  HouseholdType,
} from '@/lib/services/budget-templates-service';

interface BudgetTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (templateId: string, monthlyIncome: number) => Promise<void>;
  templates: BudgetTemplate[];
  templateCategories: Record<string, BudgetTemplateCategory[]>;
}

export function BudgetTemplateModal({
  isOpen,
  onClose,
  onApply,
  templates,
  templateCategories,
}: BudgetTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [householdFilter, setHouseholdFilter] = useState<HouseholdType | 'all'>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(null);
      setMonthlyIncome('');
      setHouseholdFilter('all');
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTemplates =
    householdFilter === 'all'
      ? templates
      : templates.filter((t) => t.household_type === householdFilter);

  const householdLabels: Record<HouseholdType, string> = {
    single: 'Single',
    couple: 'Couple',
    family_small: 'Family (1-2 kids)',
    family_large: 'Family (3+ kids)',
    student: 'Student',
    retired: 'Retired',
  };

  const previewCategories = selectedTemplate && monthlyIncome
    ? templateCategories[selectedTemplate.id]?.map((cat) => ({
        ...cat,
        calculated_amount: Math.round((parseFloat(monthlyIncome) * cat.percentage) / 100 * 100) / 100,
      }))
    : [];

  const handleApply = async () => {
    if (!selectedTemplate || !monthlyIncome) return;

    setIsApplying(true);
    try {
      await onApply(selectedTemplate.id, parseFloat(monthlyIncome));
      onClose();
    } catch (error) {
      logger.error('Failed to apply template:', error, { component: 'BudgetTemplateModal', action: 'component_action' });
    } finally {
      setIsApplying(false);
    }
  };

  const totalPercentage = previewCategories.reduce((sum, cat) => sum + cat.percentage, 0);

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-white dark:bg-gray-800 sm:rounded-2xl shadow-2xl w-full sm:max-w-6xl sm:max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose a Budget Template
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Get started with a pre-built budget template tailored to your household
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Left Column: Template Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monthly Income <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      placeholder="5000"
                      className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your total monthly household income
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Household Type
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 pr-12 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 dark:text-white text-left"
                    >
                      {householdFilter === 'all' ? 'All Templates' : householdLabels[householdFilter]}
                    </button>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Custom Dropdown Menu */}
                    {isDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsDropdownOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                          <div className="py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setHouseholdFilter('all');
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left text-base flex items-center gap-3 transition-colors ${
                                householdFilter === 'all'
                                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                  : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {householdFilter === 'all' && <Check className="w-4 h-4" />}
                              <span className={householdFilter !== 'all' ? 'ml-7' : ''}>All Templates</span>
                            </button>
                            {Object.entries(householdLabels).map(([key, label]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setHouseholdFilter(key as HouseholdType);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-3 text-left text-base flex items-center gap-3 transition-colors ${
                                  householdFilter === key
                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {householdFilter === key && <Check className="w-4 h-4" />}
                                <span className={householdFilter !== key ? 'ml-7' : ''}>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    const incomeInRange =
                      !monthlyIncome ||
                      ((!template.recommended_income_min || parseFloat(monthlyIncome) >= template.recommended_income_min) &&
                        (!template.recommended_income_max || parseFloat(monthlyIncome) <= template.recommended_income_max));

                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-3xl">{template.icon}</span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                {template.name}
                                {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                                  {householdLabels[template.household_type]}
                                </span>
                                {template.recommended_income_min && template.recommended_income_max && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      incomeInRange
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                    }`}
                                  >
                                    ${template.recommended_income_min.toLocaleString()} - ${template.recommended_income_max.toLocaleString()}/mo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  Budget Preview
                </h3>

                {!selectedTemplate || !monthlyIncome ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a template and enter your monthly income to see the preview</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Budget</span>
                        <span className="text-2xl font-bold text-amber-600">
                          ${parseFloat(monthlyIncome).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Total Allocated</span>
                        <span>{totalPercentage}%</span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {previewCategories.map((category) => (
                        <div
                          key={category.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {category.icon && <span className="text-lg">{category.icon}</span>}
                              <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {category.category_name}
                              </span>
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">
                              ${category.calculated_amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {category.description}
                            </span>
                            <span className="text-xs font-medium text-amber-600">
                              {category.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!selectedTemplate || !monthlyIncome || isApplying}
              className="px-6 py-2.5 shimmer-projects text-white rounded-full transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? 'Applying Template...' : 'Apply Template'}
            </button>
          </div>
        </div>
      </div>
  );
}
