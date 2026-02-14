'use client';

import { useState } from 'react';
import { ShoppingBag, Check, Loader2 } from 'lucide-react';
import { Meal } from '@/lib/services/meals-service';
import { formatDateString } from '@/lib/utils/date-utils';
import { showSuccess } from '@/lib/utils/toast';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

interface GenerateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  meals: Meal[];
  spaceId: string;
  onSuccess?: (listId: string) => void;
}

/** Renders a modal for generating a shopping list from selected meal plans. */
export function GenerateListModal({
  isOpen,
  onClose,
  meals,
  spaceId,
  onSuccess,
}: GenerateListModalProps) {
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [listName, setListName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show meals that have recipes with ingredients
  const mealsWithRecipes = meals.filter(
    (meal) => meal.recipe && meal.recipe.ingredients
  );

  const handleToggleMeal = (mealId: string) => {
    setSelectedMealIds((prev) =>
      prev.includes(mealId)
        ? prev.filter((id) => id !== mealId)
        : [...prev, mealId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMealIds.length === mealsWithRecipes.length) {
      setSelectedMealIds([]);
    } else {
      setSelectedMealIds(mealsWithRecipes.map((m) => m.id));
    }
  };

  const handleGenerate = async () => {
    if (selectedMealIds.length === 0) {
      setError('Please select at least one meal');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/shopping/generate-from-meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealIds: selectedMealIds,
          listName: listName || undefined,
          spaceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate shopping list');
      }

      if (data.success && data.data.list) {
        // Call success callback
        if (onSuccess) {
          onSuccess(data.data.list.id);
        }

        // Close modal
        onClose();

        // Show success message with redirect option
        showSuccess(
          `Shopping list generated with ${data.data.itemCount} item${data.data.itemCount > 1 ? 's' : ''} from ${data.data.recipeCount} recipe${data.data.recipeCount > 1 ? 's' : ''}!`,
          {
            label: 'View Shopping Lists',
            onClick: () => window.location.href = '/shopping'
          }
        );
      }
    } catch (err) {
      logger.error('Generate shopping list error:', err, { component: 'GenerateListModal', action: 'component_action' });
      setError(err instanceof Error ? err.message : 'Failed to generate shopping list');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setSelectedMealIds([]);
      setListName('');
      setError(null);
      onClose();
    }
  };

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={handleClose}
        disabled={isGenerating}
        className="px-4 sm:px-6 py-2.5 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        onClick={handleGenerate}
        disabled={
          isGenerating ||
          selectedMealIds.length === 0 ||
          mealsWithRecipes.length === 0
        }
        className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Generating...</span>
            <span className="sm:hidden">...</span>
          </>
        ) : (
          <>
            <ShoppingBag className="w-4 h-4" />
            <span>Generate</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Shopping List"
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-emerald-500 to-green-600"
      footer={footerContent}
    >
      <div className="space-y-6">
          {/* List Name Input */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              List Name (optional)
            </label>
            <input
              type="text"
              value={listName}
              id="field-1"
              onChange={(e) =>  setListName(e.target.value)}
              placeholder="e.g., Weekly Groceries"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-white"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Leave blank to auto-generate a name
            </p>
          </div>

          {/* Meal Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                Select Meals ({selectedMealIds.length} selected)
              </label>
              <button
                onClick={handleSelectAll}
                disabled={isGenerating}
                className="text-sm text-emerald-400 hover:underline disabled:opacity-50"
              >
                {selectedMealIds.length === mealsWithRecipes.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            {mealsWithRecipes.length === 0 ? (
              <div className="text-center py-8 px-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">
                  No meals with recipes found
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Plan some meals with recipes first
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {mealsWithRecipes.map((meal) => (
                  <button
                    key={meal.id}
                    onClick={() => handleToggleMeal(meal.id)}
                    disabled={isGenerating}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                      selectedMealIds.includes(meal.id)
                        ? 'border-emerald-500 bg-emerald-900/20'
                        : 'border-gray-700 hover:border-emerald-700'
                    } disabled:opacity-50`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedMealIds.includes(meal.id)
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-600'
                      }`}
                    >
                      {selectedMealIds.includes(meal.id) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>

                    {/* Meal Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white truncate">
                          {meal.name}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            meal.meal_type === 'breakfast'
                              ? 'bg-yellow-900/30 text-yellow-300'
                              : meal.meal_type === 'lunch'
                              ? 'bg-orange-900/30 text-orange-300'
                              : 'bg-purple-900/30 text-purple-300'
                          }`}
                        >
                          {meal.meal_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>
                          {formatDateString(meal.scheduled_date)}
                        </span>
                        {meal.recipe && (
                          <>
                            <span>•</span>
                            <span className="truncate">{meal.recipe.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-base md:text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
