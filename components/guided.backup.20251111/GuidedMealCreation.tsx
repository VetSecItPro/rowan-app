'use client';

import { useState } from 'react';
import { UtensilsCrossed, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import StepIndicator from './StepIndicator';
import { useAuth } from '@/lib/contexts/auth-context';
import { mealsService } from '@/lib/services/meals-service';
import { markFlowComplete } from '@/lib/services/user-progress-service';

interface GuidedMealCreationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedMealCreation({ onComplete, onSkip }: GuidedMealCreationProps) {
  const { user, currentSpace } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [plannedDate, setPlannedDate] = useState('');
  const [notes, setNotes] = useState('');

  const stepTitles = ['Welcome', 'Meal Planning', 'Success'];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateMeal = async () => {
    if (!currentSpace || !user) return;

    try {
      setLoading(true);

      // Use current date if no date is provided
      const scheduledDate = plannedDate || new Date().toISOString().split('T')[0];

      await mealsService.createMeal({
        space_id: currentSpace.id,
        meal_type: mealType,
        scheduled_date: scheduledDate,
        notes: title || notes || 'My first planned meal',
      });

      // Mark this guided flow as complete
      await markFlowComplete(user.id, 'first_meal_planned');

      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating meal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-orange-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <StepIndicator currentStep={currentStep} totalSteps={3} stepTitles={stepTitles} />

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 dark:bg-orange-900 rounded-full">
              <UtensilsCrossed className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Plan Your First Meal
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Organize your meals and save time deciding what to eat.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Plan meals together and make cooking easier.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
                aria-label="Skip meal planning"
              >
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Start planning first meal"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Meal Planning */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What's on the menu?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Plan a meal for the week ahead
              </p>
            </div>

            <div>
              <label htmlFor="meal-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meal Title (Optional)
              </label>
              <input
                id="meal-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Pasta Night"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all min-h-[44px]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meal Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'breakfast', label: 'Breakfast' },
                  { value: 'lunch', label: 'Lunch' },
                  { value: 'dinner', label: 'Dinner' },
                  { value: 'snack', label: 'Snack' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setMealType(type.value as typeof mealType)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
                      mealType === type.value
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={`Set meal type to ${type.label}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="planned-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Planned Date (Optional)
              </label>
              <input
                id="planned-date"
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="meal-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="meal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about ingredients, recipes, or preferences..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                <strong>Tip:</strong> Plan your meals for the week to save time and reduce food waste!
              </p>
            </div>

            <div className="flex gap-4 justify-between pt-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Go back to previous step"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleCreateMeal}
                disabled={loading}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                aria-label={loading ? 'Planning meal...' : 'Plan meal'}
              >
                {loading ? 'Planning...' : 'Plan Meal'}
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <UtensilsCrossed className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Meal Planned Successfully!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your first meal has been added to the plan.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                You can now see it on your meal calendar.
              </p>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                What you can do with meal planning:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                  <span>Plan meals for the week to reduce daily decisions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                  <span>Save and reuse favorite recipes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                  <span>Generate shopping lists from meal ingredients</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                  <span>Coordinate meal prep with your partner</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              aria-label="Go to meal planner"
            >
              Go to Meal Planner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
