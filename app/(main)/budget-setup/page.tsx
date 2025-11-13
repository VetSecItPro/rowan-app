'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowRight, Check } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { TemplateGallery } from '@/components/budget/TemplateGallery';
import { TemplatePreview } from '@/components/budget/TemplatePreview';
import { IncomeInput } from '@/components/budget/IncomeInput';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import {
  budgetTemplatesService,
  type BudgetTemplate,
  type BudgetTemplateCategory,
} from '@/lib/services/budget-templates-service';
import { safeValidateApplyTemplate } from '@/lib/validations/budget-templates';
import { useRouter } from 'next/navigation';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

export default function BudgetSetupPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const router = useRouter();

  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [templateCategories, setTemplateCategories] = useState<
    Record<string, BudgetTemplateCategory[]>
  >({});
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [isIncomeValid, setIsIncomeValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true);
        const fetchedTemplates = await budgetTemplatesService.getBudgetTemplates();
        setTemplates(fetchedTemplates);

        // Load categories for each template
        const categoriesMap: Record<string, BudgetTemplateCategory[]> = {};
        await Promise.all(
          fetchedTemplates.map(async (template) => {
            const categories = await budgetTemplatesService.getTemplateCategories(template.id);
            categoriesMap[template.id] = categories;
          })
        );
        setTemplateCategories(categoriesMap);
      } catch (err) {
        console.error('Failed to load templates:', err);
        setError('Failed to load budget templates. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  const handleApplyTemplate = useCallback(async () => {
    if (!spaceId || !selectedTemplate || !monthlyIncome || !isIncomeValid) {
      return;
    }

    // Validate input with Zod
    const validation = safeValidateApplyTemplate({
      space_id: spaceId,
      template_id: selectedTemplate.id,
      monthly_income: monthlyIncome,
    });

    if (!validation.success) {
      setError('Invalid input. Please check your entries and try again.');
      return;
    }

    setApplying(true);
    setError(null);

    try {
      await budgetTemplatesService.applyTemplate(validation.data);
      setSuccess(true);

      // Redirect to projects page after short delay
      setTimeout(() => {
        router.push('/projects?tab=budgets');
      }, 2000);
    } catch (err) {
      console.error('Failed to apply template:', err);
      setError('Failed to apply budget template. Please try again.');
    } finally {
      setApplying(false);
    }
  }, [spaceId, selectedTemplate, monthlyIncome, isIncomeValid, router]);

  const selectedCategories = selectedTemplate
    ? templateCategories[selectedTemplate.id] || []
    : [];

  const canApply =
    !!selectedTemplate && monthlyIncome > 0 && isIncomeValid && !applying && !success;

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Budget Setup' },
      ]}
    >
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-600 bg-clip-text text-transparent mb-2">
              Set Up Your Budget
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose a budget template that fits your household and customize it with your monthly
              income
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-xl p-6 text-center">
              <Check className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                Budget Template Applied!
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Redirecting you to your budget overview...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-xl p-4">
              <p className="text-red-800 dark:text-red-200 text-center">{error}</p>
            </div>
          )}

          {/* Main Content */}
          {!success && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Income Input & Template Selection */}
              <div className="space-y-6">
                {/* Income Input */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <IncomeInput
                    value={monthlyIncome}
                    onChange={setMonthlyIncome}
                    onValidChange={setIsIncomeValid}
                    label="Step 1: Enter Your Monthly Income"
                    helpText="Enter your total monthly household income to see personalized budget recommendations"
                  />
                </div>

                {/* Template Gallery */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Step 2: Choose a Budget Template
                  </h2>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
                    </div>
                  ) : (
                    <TemplateGallery
                      templates={templates}
                      selectedTemplateId={selectedTemplate?.id}
                      monthlyIncome={monthlyIncome}
                      onTemplateSelect={setSelectedTemplate}
                    />
                  )}
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 sticky top-8">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Step 3: Review Your Budget
                  </h2>

                  {!selectedTemplate || monthlyIncome === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>
                        {monthlyIncome === 0
                          ? 'Enter your monthly income to get started'
                          : 'Select a template to see your budget preview'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <TemplatePreview
                        categories={selectedCategories}
                        monthlyIncome={monthlyIncome}
                      />

                      {/* Apply Button */}
                      <button
                        onClick={handleApplyTemplate}
                        disabled={!canApply}
                        className="w-full mt-6 px-6 py-4 shimmer-projects text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                      >
                        {applying ? (
                          <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                            Applying Template...
                          </>
                        ) : (
                          <>
                            Apply This Budget
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>

                      <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                        You can adjust individual categories after applying the template
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FeatureLayout>
  );
}
