'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Info, Check, ChevronDown } from 'lucide-react';
import { logger } from '@/lib/logger';
import type {
  BudgetTemplate,
  BudgetTemplateCategory,
  HouseholdType,
} from '@/lib/services/budget-templates-service';
import { Modal } from '@/components/ui/Modal';

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

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2.5 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-full transition-colors font-medium"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleApply}
        disabled={!selectedTemplate || !monthlyIncome || isApplying}
        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isApplying ? 'Applying Template...' : 'Apply Template'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose a Budget Template"
      subtitle="Get started with a pre-built budget template tailored to your household"
      maxWidth="6xl"
      headerGradient="bg-gradient-to-r from-amber-500 to-orange-500"
      footer={footerContent}
    >
      <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Left Column: Template Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
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
                      className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter your total monthly household income
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Filter by Household Type
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 pr-12 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white text-left"
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
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                          <div className="py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setHouseholdFilter('all');
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left text-base flex items-center gap-3 transition-colors ${
                                householdFilter === 'all'
                                  ? 'bg-amber-900/20 text-amber-300'
                                  : 'text-white hover:bg-gray-700'
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
                                    ? 'bg-amber-900/20 text-amber-300'
                                    : 'text-white hover:bg-gray-700'
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
                            ? 'border-amber-500 bg-amber-900/20'
                            : 'border-gray-700 hover:border-amber-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-3xl">{template.icon}</span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white flex items-center gap-2">
                                {template.name}
                                {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                                  {householdLabels[template.household_type]}
                                </span>
                                {template.recommended_income_min && template.recommended_income_max && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      incomeInRange
                                        ? 'bg-green-900/30 text-green-300'
                                        : 'bg-yellow-900/30 text-yellow-300'
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
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  Budget Preview
                </h3>

                {!selectedTemplate || !monthlyIncome ? (
                  <div className="text-center py-12 text-gray-400">
                    <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a template and enter your monthly income to see the preview</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Total Budget</span>
                        <span className="text-2xl font-bold text-amber-600">
                          ${parseFloat(monthlyIncome).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Total Allocated</span>
                        <span>{totalPercentage}%</span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {previewCategories.map((category) => (
                        <div
                          key={category.id}
                          className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {category.icon && <span className="text-lg">{category.icon}</span>}
                              <span className="font-medium text-white text-sm">
                                {category.category_name}
                              </span>
                            </div>
                            <span className="font-bold text-white">
                              ${category.calculated_amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
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
    </Modal>
  );
}
