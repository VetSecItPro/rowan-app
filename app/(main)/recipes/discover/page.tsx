'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, ExternalLink, Loader2, ChefHat, Clock, Users, Calendar, X } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { QuickPlanModal } from '@/components/meals/QuickPlanModal';
import { RecipePreviewModal } from '@/components/meals/RecipePreviewModal';
import {
  searchExternalRecipes,
  getRandomRecipes,
  searchByCuisine,
  SUPPORTED_CUISINES,
  type ExternalRecipe
} from '@/lib/services/external-recipes-service';
import { mealsService } from '@/lib/services/meals-service';
import { useDebouncedCallback } from 'use-debounce';
import { showSuccess, showError, showInfo } from '@/lib/utils/toast';

export default function DiscoverRecipesPage() {
  const { user } = useAuth();
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
  const [spaceLoading, setSpaceLoading] = useState(true);
  const [spaceError, setSpaceError] = useState<string | null>(null);

  // Load user's current space
  useEffect(() => {
    const loadSpace = async () => {
      if (!user) {
        console.log('No user found, skipping space load');
        setSpaceLoading(false);
        return;
      }

      try {
        setSpaceLoading(true);
        setSpaceError(null);

        console.log('Loading spaces for user:', user.id);
        const response = await fetch('/api/spaces');

        if (!response.ok) {
          throw new Error(`Failed to load spaces: ${response.statusText}`);
        }

        const spaces = await response.json();
        console.log('Loaded spaces:', spaces);

        if (spaces && Array.isArray(spaces) && spaces.length > 0) {
          setCurrentSpaceId(spaces[0].id);
          console.log('Current space ID set to:', spaces[0].id);
        } else {
          setSpaceError('No space found. Please create a space first.');
          console.error('No spaces found for user');
        }
      } catch (error: any) {
        console.error('Failed to load space:', error);
        setSpaceError(error?.message || 'Failed to load your space. Please try again.');
      } finally {
        setSpaceLoading(false);
      }
    };

    loadSpace();
  }, [user]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<ExternalRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingRecipeIds, setAddingRecipeIds] = useState<Set<string>>(new Set());
  const [planningRecipe, setPlanningRecipe] = useState<ExternalRecipe | null>(null);
  const [isQuickPlanOpen, setIsQuickPlanOpen] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<ExternalRecipe | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load random recipes on mount
  useEffect(() => {
    loadRandomRecipes();
  }, []);

  const loadRandomRecipes = async () => {
    setLoading(true);
    try {
      const randomRecipes = await getRandomRecipes(12);
      setRecipes(randomRecipes);
    } catch (error) {
      console.error('Failed to load random recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const performSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      loadRandomRecipes();
      return;
    }

    setLoading(true);
    try {
      const results = await searchExternalRecipes(query);
      setRecipes(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearchTyping(true);
    setTimeout(() => setIsSearchTyping(false), 300);
    setSelectedCuisine(null); // Clear cuisine filter when searching
    performSearch(value);
  };

  const handleCuisineClick = async (cuisine: string) => {
    setSearchQuery(''); // Clear search when filtering by cuisine
    setSelectedCuisine(cuisine);
    setLoading(true);
    try {
      const results = await searchByCuisine(cuisine);
      setRecipes(results);
    } catch (error) {
      console.error('Cuisine search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCuisine(null);
    loadRandomRecipes();
  };

  const handlePlanMeal = useCallback(async (externalRecipe: ExternalRecipe) => {
    if (!currentSpaceId) {
      showInfo('Please wait while loading your space...');
      return;
    }

    setPlanningRecipe(externalRecipe);
    setIsQuickPlanOpen(true);
  }, [currentSpaceId]);

  const handleQuickPlan = useCallback(async (date: string, mealType: string, createShoppingList: boolean) => {
    if (!currentSpaceId || !planningRecipe) return;

    try {
      // First, save recipe to library
      const recipeData = {
        space_id: currentSpaceId,
        name: planningRecipe.name,
        description: planningRecipe.description || '',
        prep_time: planningRecipe.prep_time,
        cook_time: planningRecipe.cook_time,
        servings: planningRecipe.servings,
        difficulty: planningRecipe.difficulty || undefined,
        cuisine_type: planningRecipe.cuisine || undefined,
        image_url: planningRecipe.image_url || undefined,
        instructions: planningRecipe.instructions || undefined,
        source_url: planningRecipe.source_url || undefined,
        ingredients: planningRecipe.ingredients.map(ing => ({
          name: ing.name,
          amount: ing.amount || '',
          unit: ing.unit || '',
        })),
        tags: [planningRecipe.source, planningRecipe.cuisine].filter(Boolean) as string[],
      };

      const savedRecipe = await mealsService.createRecipe(recipeData);

      // Then create meal with the saved recipe
      const mealData = {
        space_id: currentSpaceId,
        recipe_id: savedRecipe.id,
        name: planningRecipe.name,
        meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        scheduled_date: date,
        notes: '',
      };

      const meal = await mealsService.createMeal(mealData);

      // Create shopping list if requested
      if (createShoppingList && planningRecipe.ingredients.length > 0) {
        const { shoppingService } = await import('@/lib/services/shopping-service');
        const { format } = await import('date-fns');

        const formattedDate = format(new Date(date), 'MM/dd/yyyy');
        const listTitle = `${planningRecipe.name} - ${formattedDate}`;

        const list = await shoppingService.createList({
          space_id: currentSpaceId,
          title: listTitle,
          description: `Ingredients for ${planningRecipe.name}`,
          status: 'active',
        });

        // Add ingredients
        await Promise.all(
          planningRecipe.ingredients.map((ing) => {
            const ingredientText = [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ');
            return shoppingService.createItem({
              list_id: list.id,
              name: ingredientText,
              quantity: 1,
            });
          })
        );

        showSuccess(
          `Meal planned and shopping list created with ${planningRecipe.ingredients.length} ingredients!`,
          {
            label: 'View Meals',
            onClick: () => window.location.href = '/meals'
          }
        );
      } else {
        showSuccess('Meal planned successfully!', {
          label: 'View Meals',
          onClick: () => window.location.href = '/meals'
        });
      }

      // Close modal and reset
      setIsQuickPlanOpen(false);
      setPlanningRecipe(null);
    } catch (error: any) {
      console.error('Failed to plan meal:', error);
      showError(`Failed to plan meal: ${error?.message || 'Unknown error'}`);
    }
  }, [currentSpaceId, planningRecipe]);

  const handleAddToLibrary = useCallback(async (externalRecipe: ExternalRecipe) => {
    if (!currentSpaceId) {
      showInfo('Please wait while loading your space...');
      return;
    }

    setAddingRecipeIds(prev => new Set(prev).add(externalRecipe.id));

    try {
      // Prepare recipe data
      const recipeData = {
        space_id: currentSpaceId,
        name: externalRecipe.name,
        description: externalRecipe.description || '',
        prep_time: externalRecipe.prep_time,
        cook_time: externalRecipe.cook_time,
        servings: externalRecipe.servings,
        difficulty: externalRecipe.difficulty || undefined,
        cuisine_type: externalRecipe.cuisine || undefined,
        image_url: externalRecipe.image_url || undefined,
        instructions: externalRecipe.instructions || undefined,
        source_url: externalRecipe.source_url || undefined,
        ingredients: externalRecipe.ingredients.map(ing => ({
          name: ing.name,
          amount: ing.amount || '',
          unit: ing.unit || '',
        })),
        tags: [externalRecipe.source, externalRecipe.cuisine].filter(Boolean) as string[],
      };

      console.log('Adding recipe to library:', recipeData);

      // Convert external recipe to our format
      const result = await mealsService.createRecipe(recipeData);

      console.log('Recipe added successfully:', result);
      showSuccess('Recipe added to your library!', {
        label: 'View Library',
        onClick: () => window.location.href = '/recipes'
      });
    } catch (error: any) {
      console.error('Failed to add recipe - Full error:', error);
      console.error('Error message:', error?.message);
      console.error('Error details:', error?.details || error?.hint);

      const errorMsg = error?.message || 'Unknown error occurred';
      showError(`Failed to add recipe: ${errorMsg}`);
    } finally {
      setAddingRecipeIds(prev => {
        const next = new Set(prev);
        next.delete(externalRecipe.id);
        return next;
      });
    }
  }, [currentSpaceId]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <ChefHat className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold">Discover Recipes</h1>
              <p className="text-orange-100 mt-1">Search thousands of recipes from multiple sources</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className={`apple-search-container group ${isSearchTyping ? 'apple-search-typing' : ''}`}>
              <Search className="apple-search-icon" />
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search for pasta, chicken, desserts..."
                className="apple-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCuisine(null);
                    loadRandomRecipes();
                  }}
                  className="apple-search-clear"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cuisine Filters */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by cuisine:</span>
            {selectedCuisine && (
              <button
                onClick={handleClearFilters}
                className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ✕ Clear filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_CUISINES.map((cuisine) => (
              <button
                key={cuisine.value}
                onClick={() => handleCuisineClick(cuisine.value)}
                className={`px-4 py-2.5 md:px-4 md:py-2 text-sm min-h-[44px] md:min-h-0 rounded-full font-medium transition-all ${
                  selectedCuisine === cuisine.value
                    ? 'bg-orange-500 text-white shadow-md scale-105'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-gray-600 hover:scale-105'
                }`}
              >
                <span className="mr-1">{cuisine.flag}</span>
                {cuisine.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Searching recipes...</span>
          </div>
        )}

        {/* Results Grid */}
        {!loading && recipes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Recipe Image - Clickable */}
                {recipe.image_url && (
                  <button
                    onClick={() => {
                      setPreviewRecipe(recipe);
                      setIsPreviewOpen(true);
                    }}
                    className="w-full h-48 overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer group"
                  >
                    <img
                      src={recipe.image_url}
                      alt={recipe.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                )}

                <div className="p-5">
                  {/* Source Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSourceBadgeColor(recipe.source)}`}>
                      {getSourceLabel(recipe.source)}
                    </span>
                    {recipe.source_url && (
                      <a
                        href={recipe.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-orange-500 transition-colors"
                        title="View original recipe"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Recipe Name - Clickable */}
                  <button
                    onClick={() => {
                      setPreviewRecipe(recipe);
                      setIsPreviewOpen(true);
                    }}
                    className="text-left w-full group"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {recipe.name}
                    </h3>
                  </button>

                  {/* Description */}
                  {recipe.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {recipe.prep_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{recipe.prep_time}m</span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{recipe.servings}</span>
                      </div>
                    )}
                  </div>

                  {/* Ingredients Preview */}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {recipe.ingredients.length} ingredients
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {ing.name}
                          </span>
                        ))}
                        {recipe.ingredients.length > 3 && (
                          <span className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400">
                            +{recipe.ingredients.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handlePlanMeal(recipe)}
                      className="py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Plan Meal
                    </button>
                    <button
                      onClick={() => handleAddToLibrary(recipe)}
                      disabled={addingRecipeIds.has(recipe.id)}
                      className="py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {addingRecipeIds.has(recipe.id) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && recipes.length === 0 && (
          <div className="text-center py-12">
            <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? "No recipes found" : "No recipes available"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery
                ? "Try searching for something else"
                : "Unable to load recipes at the moment. Please try refreshing the page."
              }
            </p>
          </div>
        )}
      </div>

      {/* Quick Plan Modal */}
      {planningRecipe && (
        <QuickPlanModal
          isOpen={isQuickPlanOpen}
          onClose={() => {
            setIsQuickPlanOpen(false);
            setPlanningRecipe(null);
          }}
          onPlan={handleQuickPlan}
          recipeName={planningRecipe.name}
        />
      )}

      {/* Recipe Preview Modal */}
      <RecipePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewRecipe(null);
        }}
        recipe={previewRecipe}
        onPlanMeal={(recipe) => {
          setPreviewRecipe(null);
          setIsPreviewOpen(false);
          handlePlanMeal(recipe);
        }}
        onAddToLibrary={(recipe) => {
          setPreviewRecipe(null);
          setIsPreviewOpen(false);
          handleAddToLibrary(recipe);
        }}
      />
    </div>
  );
}
