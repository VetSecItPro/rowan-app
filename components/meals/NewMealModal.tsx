'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Sunrise, Sun, Moon, Cookie, ChefHat, ShoppingCart, Search, Save } from 'lucide-react';
import { CreateMealInput, Meal, Recipe } from '@/lib/services/meals-service';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';

interface NewMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: CreateMealInput, createShoppingList?: boolean) => void;
  editMeal?: Meal | null;
  spaceId: string;
  recipes?: Recipe[];
  onOpenRecipeDiscover?: () => void;
}

export function NewMealModal({ isOpen, onClose, onSave, editMeal, spaceId, recipes = [], onOpenRecipeDiscover }: NewMealModalProps) {
  const [formData, setFormData] = useState<CreateMealInput>({
    space_id: spaceId,
    name: '',
    meal_type: 'dinner',
    scheduled_date: '',
    notes: '',
  });
  const [isMealTypeOpen, setIsMealTypeOpen] = useState(false);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [createShoppingList, setCreateShoppingList] = useState(true);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);

  const selectedRecipe = recipes.find(r => r.id === formData.recipe_id);
  const isEditing = editMeal && editMeal.id; // Only true if editing an existing meal

  // Get unique cuisines and difficulties from recipes
  const uniqueCuisines = useMemo(() => {
    const cuisines = new Set(recipes.map(r => r.cuisine_type).filter(Boolean));
    return Array.from(cuisines).sort();
  }, [recipes]);

  const uniqueDifficulties = useMemo(() => {
    const difficulties = new Set(recipes.map(r => r.difficulty).filter(Boolean));
    return Array.from(difficulties).sort();
  }, [recipes]);

  // Filter recipes based on search and filters
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchesSearch = !recipeSearch || r.name.toLowerCase().includes(recipeSearch.toLowerCase());
      const matchesCuisine = !cuisineFilter || r.cuisine_type === cuisineFilter;
      const matchesDifficulty = !difficultyFilter || r.difficulty === difficultyFilter;
      return matchesSearch && matchesCuisine && matchesDifficulty;
    });
  }, [recipes, recipeSearch, cuisineFilter, difficultyFilter]);

  const hasActiveFilters = recipeSearch || cuisineFilter || difficultyFilter;

  const clearFilters = () => {
    setRecipeSearch('');
    setCuisineFilter(null);
    setDifficultyFilter(null);
  };

  const mealTypeOptions = [
    { value: 'breakfast', label: 'Breakfast', icon: Sunrise, color: 'text-orange-500' },
    { value: 'lunch', label: 'Lunch', icon: Sun, color: 'text-yellow-500' },
    { value: 'dinner', label: 'Dinner', icon: Moon, color: 'text-indigo-500' },
    { value: 'snack', label: 'Snack', icon: Cookie, color: 'text-amber-500' },
  ];

  useEffect(() => {
    if (editMeal) {
      // Convert ISO timestamp to yyyy-MM-dd format for date input
      const dateValue = editMeal.scheduled_date ? editMeal.scheduled_date.split('T')[0] : '';

      setFormData({
        space_id: spaceId,
        recipe_id: editMeal.recipe_id,
        name: editMeal.name || '',
        meal_type: editMeal.meal_type,
        scheduled_date: dateValue,
        notes: editMeal.notes || '',
      });
    } else {
      setFormData({
        space_id: spaceId,
        name: '',
        meal_type: 'dinner',
        scheduled_date: '',
        notes: '',
      });
    }
  }, [editMeal, spaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, createShoppingList && !!formData.recipe_id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-[90vw] sm:h-auto sm:rounded-xl sm:max-w-3xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">{isEditing ? 'Edit Meal' : 'Plan New Meal'}</h2>
            <button onClick={onClose} aria-label="Close modal" className="btn-touch w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-orange-700 transition-all active-press">
              <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-2">Meal Type *</label>
            <button
              type="button"
              onClick={() => setIsMealTypeOpen(!isMealTypeOpen)}
              className="btn-touch w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white flex items-center justify-between hover-lift active-press"
            >
              <div className="flex items-center gap-2">
                {(() => {
                  const selected = mealTypeOptions.find(opt => opt.value === formData.meal_type);
                  const Icon = selected?.icon || Moon;
                  return (
                    <>
                      <Icon className={`w-4 h-4 ${selected?.color || 'text-gray-500'}`} />
                      <span>{selected?.label || 'Select meal type'}</span>
                    </>
                  );
                })()}
              </div>
              <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isMealTypeOpen && (
              <div className="absolute z-10 w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                {mealTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, meal_type: option.value as any });
                        setIsMealTypeOpen(false);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left active-press"
                    >
                      <Icon className={`w-4 h-4 ${option.color}`} />
                      <span className="text-gray-900 dark:text-white">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="relative">
            <label htmlFor="field-2"className="block text-sm font-medium mb-2 text-gray-900 dark:text-white cursor-pointer">Recipe (Optional)</label>
            <button
              type="button"
              onClick={() => setIsRecipeSelectorOpen(!isRecipeSelectorOpen)}
              className="btn-touch w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white flex items-center justify-between hover-lift active-press"
            >
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-500" />
                <span>{selectedRecipe ? selectedRecipe.name : 'No recipe selected'}</span>
              </div>
              <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isRecipeSelectorOpen && (
              <div className="absolute z-10 w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                {/* Search Input */}
                <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 z-10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search recipes..."
                      value={recipeSearch}
                      id="field-2"
              onChange={(e) =>  setRecipeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Filter Chips */}
                  {(uniqueCuisines.length > 0 || uniqueDifficulties.length > 0) && (
                    <div className="mt-2 space-y-2">
                      {/* Cuisine Filters */}
                      {uniqueCuisines.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {uniqueCuisines.slice(0, 4).map((cuisine) => (
                            <button
                              key={cuisine}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCuisineFilter(cuisine === cuisineFilter ? null : (cuisine || null));
                              }}
                              className={`btn-touch px-2 py-1 text-xs rounded-full transition-colors active-press ${
                                cuisineFilter === cuisine
                                  ? 'bg-orange-500 text-white shimmer-orange'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover-lift'
                              }`}
                            >
                              {cuisine}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearFilters();
                          }}
                          className="btn-touch text-xs text-orange-600 dark:text-orange-400 hover:underline active-press px-1 py-0.5"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}

                  {/* Recipe Count */}
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {filteredRecipes.length} of {recipes.length} recipes
                  </div>
                </div>

                {/* Recipe List */}
                <div className="max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, recipe_id: undefined });
                      setIsRecipeSelectorOpen(false);
                    }}
                    className="btn-touch w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left active-press"
                  >
                    <span className="text-gray-500 dark:text-gray-400 italic">No recipe</span>
                  </button>

                  {/* Discover Recipes Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRecipeSelectorOpen(false);
                      if (onOpenRecipeDiscover) {
                        onOpenRecipeDiscover();
                      }
                    }}
                    className="btn-touch w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-y border-orange-200 dark:border-orange-700 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30 transition-all group shimmer-orange hover-lift active-press"
                  >
                    <div className="flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-orange-700 dark:text-orange-300 font-medium text-sm">
                        Discover Recipes
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, recipe_id: recipe.id });
                        setIsRecipeSelectorOpen(false);
                        clearFilters();
                      }}
                      className="btn-touch w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left border-t border-gray-200 dark:border-gray-700 active-press"
                    >
                      <ChefHat className="w-4 h-4 text-orange-500" />
                      <div className="flex-1">
                        <span className="text-gray-900 dark:text-white">{recipe.name}</span>
                        {recipe.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{recipe.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredRecipes.length === 0 && recipes.length > 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        No recipes found
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFilters();
                        }}
                        className="btn-touch text-sm text-orange-600 dark:text-orange-400 hover:underline active-press px-2 py-1"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                  {recipes.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-2">
                        No recipes in your library
                      </p>
                      <a
                        href="/recipes/discover"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-touch text-sm text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1 active-press px-2 py-1 rounded-md"
                      >
                        <ChefHat className="w-3 h-3" />
                        Discover recipes to add
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {formData.recipe_id && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <input
                type="checkbox"
                id="createShoppingList"
                checked={createShoppingList}
                onChange={(e) => setCreateShoppingList(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="createShoppingList" className="flex items-center gap-2 text-sm text-gray-900 dark:text-white cursor-pointer">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Add ingredients to Shopping List</span>
              </label>
            </div>
          )}
          <div>
            <label htmlFor="field-4"className="block text-sm font-medium mb-2 text-gray-900 dark:text-white cursor-pointer">Meal Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Family Dinner, Quick Lunch"
              value={formData.name || ''}
              id="field-4"
              onChange={(e) =>  setFormData({ ...formData, name: e.target.value })}
              className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="field-5"className="block text-sm font-medium mb-2 text-gray-900 dark:text-white cursor-pointer">Date *</label>
            <input type="date" required value={formData.scheduled_date} id="field-5"
              onChange={(e) =>  setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label htmlFor="field-6"className="block text-sm font-medium mb-2 cursor-pointer">Notes</label>
            <textarea value={formData.notes} id="field-6"
              onChange={(e) =>  setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <SecondaryButton
              type="button"
              onClick={onClose}
              feature="meals"
            >
              Cancel
            </SecondaryButton>
            <CTAButton
              type="submit"
              feature="meals"
              breathing
              ripple
              icon={isEditing ? <Save className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
            >
              {isEditing ? 'Save' : 'Create'}
            </CTAButton>
          </div>
        </form>
      </div>
    </div>
  );
}
