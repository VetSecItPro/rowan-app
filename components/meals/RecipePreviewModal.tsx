'use client';

import { X, Clock, Users, ChefHat, ExternalLink, Plus, Calendar } from 'lucide-react';
import { ExternalRecipe } from '@/lib/services/external-recipes-service';

interface RecipePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: ExternalRecipe | null;
  onPlanMeal: (recipe: ExternalRecipe) => void;
  onAddToLibrary: (recipe: ExternalRecipe) => void;
}

export function RecipePreviewModal({
  isOpen,
  onClose,
  recipe,
  onPlanMeal,
  onAddToLibrary
}: RecipePreviewModalProps) {
  if (!isOpen || !recipe) return null;

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'themealdb':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'spoonacular':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'edamam':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'tasty':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'apininjas':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'themealdb':
        return 'TheMealDB';
      case 'spoonacular':
        return 'Spoonacular';
      case 'edamam':
        return 'Edamam';
      case 'tasty':
        return 'Tasty';
      case 'apininjas':
        return 'API Ninjas';
      default:
        return source;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Image */}
        <div className="relative">
          {recipe.image_url && (
            <div className="h-64 overflow-hidden bg-gray-200 dark:bg-gray-700">
              <img
                src={recipe.image_url}
                alt={recipe.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Source Badge */}
          <div className="absolute top-4 left-4">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getSourceBadgeColor(recipe.source)}`}>
              {getSourceLabel(recipe.source)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title and Meta */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {recipe.name}
              </h2>
              {recipe.source_url && (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                  title="View original recipe"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              {recipe.prep_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{recipe.prep_time}m prep</span>
                </div>
              )}
              {recipe.cook_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{recipe.cook_time}m cook</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{recipe.servings} servings</span>
                </div>
              )}
              {recipe.difficulty && (
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4" />
                  <span className="capitalize">{recipe.difficulty}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {recipe.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Description
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {recipe.description}
              </p>
            </div>
          )}

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Ingredients ({recipe.ingredients.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recipe.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Instructions
              </h3>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {recipe.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Tags */}
          {recipe.cuisine && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Cuisine
              </h3>
              <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">
                {recipe.cuisine}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onAddToLibrary(recipe);
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add to Library
          </button>
          <button
            onClick={() => {
              onPlanMeal(recipe);
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg transition-all flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Plan Meal
          </button>
        </div>
      </div>
    </div>
  );
}
