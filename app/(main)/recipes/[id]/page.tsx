'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, Users, ChefHat, ExternalLink, Edit, Trash2, Loader2, Calendar } from 'lucide-react';
import { mealsService, type Recipe } from '@/lib/services/meals-service';
import Link from 'next/link';

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recipeId = params.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadRecipe = async () => {
      try {
        const data = await mealsService.getRecipeById(recipeId);
        setRecipe(data);
      } catch (error) {
        console.error('Failed to load recipe:', error);
      } finally {
        setLoading(false);
      }
    };

    if (recipeId) {
      loadRecipe();
    }
  }, [recipeId]);

  const handleDelete = async () => {
    if (!recipe || !confirm('Are you sure you want to delete this recipe?')) return;

    setDeleting(true);
    try {
      await mealsService.deleteRecipe(recipe.id);
      alert('Recipe deleted successfully');
      router.push('/recipes');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('Failed to delete recipe. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">Loading recipe...</span>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Recipe not found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The recipe you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Recipes
          </Link>
        </div>
      </div>
    );
  }

  // Parse ingredients to handle both string and object formats
  const parseIngredients = () => {
    if (!recipe.ingredients) return [];
    return recipe.ingredients.map((ing: any) => {
      if (typeof ing === 'string') {
        return { name: ing, amount: '', unit: '' };
      }
      return ing;
    });
  };

  const ingredients = parseIngredients();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/recipes"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <ChefHat className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Recipe Details</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {recipe.source_url && (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 backdrop-blur-sm border border-white/20"
              >
                <ExternalLink className="w-4 h-4" />
                View Source
              </a>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors flex items-center gap-2 backdrop-blur-sm border border-red-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recipe Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recipe Image */}
        {recipe.image_url ? (
          <div className="rounded-xl overflow-hidden shadow-lg mb-8 bg-gray-200 dark:bg-gray-700">
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="w-full h-96 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden shadow-lg mb-8 bg-gradient-to-br from-orange-400 to-orange-600 h-96 flex items-center justify-center">
            <ChefHat className="w-32 h-32 text-white/30" />
          </div>
        )}

        {/* Recipe Name */}
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {recipe.name}
        </h2>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {recipe.prep_time && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Prep:</span>
              <span>{recipe.prep_time}m</span>
            </div>
          )}
          {recipe.cook_time && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Cook:</span>
              <span>{recipe.cook_time}m</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Users className="w-5 h-5" />
              <span className="font-medium">Servings:</span>
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {recipe.cuisine_type && (
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
              {recipe.cuisine_type}
            </span>
          )}
          {recipe.difficulty && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              {recipe.difficulty}
            </span>
          )}
          {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Description */}
        {recipe.description && (
          <div className="mb-8">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {recipe.description}
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ingredients */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ingredients
            </h3>
            <ul className="space-y-3">
              {ingredients.map((ingredient: any, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {ingredient.amount && ingredient.unit ? (
                      <>
                        <span className="font-medium">{ingredient.amount} {ingredient.unit}</span>{' '}
                        {ingredient.name}
                      </>
                    ) : (
                      ingredient.name
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Instructions
            </h3>
            {recipe.instructions ? (
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {recipe.instructions}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                No instructions provided
              </p>
            )}
          </div>
        </div>

        {/* Add to Meal Plan Button */}
        <div className="mt-8 flex justify-center">
          <Link
            href={`/meals?recipe=${recipe.id}`}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-3 text-lg"
          >
            <Calendar className="w-6 h-6" />
            Add to Meal Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
