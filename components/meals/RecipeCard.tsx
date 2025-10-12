'use client';

import { Recipe } from '@/lib/services/meals-service';
import { Clock, Users, Edit, Trash2, ChefHat } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
  onPlanMeal: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onEdit, onDelete, onPlanMeal }: RecipeCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
      {recipe.image_url && (
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {!recipe.image_url && (
        <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
          <ChefHat className="w-16 h-16 text-purple-400" />
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{recipe.name}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(recipe)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit recipe"
              aria-label="Edit recipe"
            >
              <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => onDelete(recipe.id)}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete recipe"
              aria-label="Delete recipe"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>

        {recipe.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          {(() => {
            const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
            if (totalTime > 0) {
              return (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{totalTime} min</span>
                </div>
              );
            }
            return null;
          })()}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium"
              >
                {typeof tag === 'string' ? tag : JSON.stringify(tag)}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => onPlanMeal(recipe)}
          className="w-full px-4 py-2 shimmer-meals text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Plan This Meal
        </button>
      </div>
    </div>
  );
}
