'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

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

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <button
        onClick={onClose}
        className="px-4 sm:px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        onClick={handleConfirm}
        disabled={selectedIngredients.size === 0}
        className="px-4 sm:px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
      >
        <ShoppingCart className="w-4 h-4" />
        <span className="hidden sm:inline">Add {selectedIngredients.size} to List</span>
        <span className="sm:hidden">Add ({selectedIngredients.size})</span>
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review Ingredients - ${recipeName}`}
      maxWidth="md"
      headerGradient="bg-gradient-to-r from-emerald-500 to-emerald-600"
      footer={footerContent}
    >
      {/* Instructions */}
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-5 p-4 bg-emerald-900/20 border-b border-emerald-800">
        <p className="text-sm text-gray-300">
          Uncheck ingredients you already have. Only checked items will be added to your shopping list.
        </p>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-300">
          {selectedIngredients.size} of {ingredients.length} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-emerald-400 hover:underline"
          >
            Select All
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={deselectAll}
            className="text-sm text-gray-400 hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Ingredient List */}
      <div className="pt-4 space-y-2">
        {ingredients.map((ingredient, index) => {
          const isSelected = selectedIngredients.has(ingredient);
          return (
            <button
              key={index}
              onClick={() => toggleIngredient(ingredient)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                isSelected
                  ? 'bg-emerald-900/30 border-2 border-emerald-500'
                  : 'bg-gray-900 border-2 border-gray-700'
              }`}
            >
              <div
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-gray-600'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span
                className={`text-left ${
                  isSelected
                    ? 'text-white font-medium'
                    : 'text-gray-400'
                }`}
              >
                {ingredient}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
