'use client';

import { useState } from 'react';
import { X, ShoppingCart, Check } from 'lucide-react';

interface IngredientReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIngredients: string[]) => void;
  ingredients: string[];
  recipeName: string;
}

export function IngredientReviewModal({
  isOpen,
  onClose,
  onConfirm,
  ingredients,
  recipeName,
}: IngredientReviewModalProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(
    new Set(ingredients) // All checked by default
  );

  const toggleIngredient = (ingredient: string) => {
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(ingredient)) {
      newSelected.delete(ingredient);
    } else {
      newSelected.add(ingredient);
    }
    setSelectedIngredients(newSelected);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIngredients));
  };

  const selectAll = () => {
    setSelectedIngredients(new Set(ingredients));
  };

  const deselectAll = () => {
    setSelectedIngredients(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-xl">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Review Ingredients</h2>
              <p className="text-sm text-emerald-100">{recipeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-emerald-700 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Uncheck ingredients you already have. Only checked items will be added to your shopping list.
          </p>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedIngredients.size} of {ingredients.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Select All
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={deselectAll}
              className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Ingredient List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => {
              const isSelected = selectedIngredients.has(ingredient);
              return (
                <button
                  key={index}
                  onClick={() => toggleIngredient(ingredient)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-500'
                      : 'bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className={`text-left ${
                      isSelected
                        ? 'text-gray-900 dark:text-white font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {ingredient}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIngredients.size === 0}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Add {selectedIngredients.size} to Shopping List
          </button>
        </div>
      </div>
    </div>
  );
}
