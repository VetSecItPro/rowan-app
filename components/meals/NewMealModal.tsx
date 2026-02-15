'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sunrise, Sun, Moon, Cookie, ChefHat, ShoppingCart, Search, Save } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CreateMealInput, Meal, Recipe } from '@/lib/services/meals-service';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';
import { ShoppingListPreviewModal } from './ShoppingListPreviewModal';
import { Modal } from '@/components/ui/Modal';

interface NewMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: CreateMealInput, createShoppingList?: boolean) => void;
  editMeal?: Meal | null;
  spaceId: string;
  recipes?: Recipe[];
  onOpenRecipeDiscover?: () => void;
}

/** Renders a modal form for creating or editing a meal plan entry. */
export function NewMealModal({ isOpen, onClose, onSave, editMeal, spaceId, recipes = [], onOpenRecipeDiscover }: NewMealModalProps) {
  type MealType = CreateMealInput['meal_type'];
  type MealOption = { value: MealType; label: string; icon: LucideIcon; color: string };
  const [formData, setFormData] = useState<CreateMealInput>({
    space_id: spaceId,
    name: '',
    meal_type: 'dinner',
    scheduled_date: '',
    notes: '',
  });
  const [isMealTypeOpen, setIsMealTypeOpen] = useState(false);
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [createShoppingList, setCreateShoppingList] = useState(false);
  const [showShoppingPreview, setShowShoppingPreview] = useState(false);
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

  const mealTypeOptions: MealOption[] = [
    { value: 'breakfast', label: 'Breakfast', icon: Sunrise, color: 'text-orange-500' },
    { value: 'lunch', label: 'Lunch', icon: Sun, color: 'text-yellow-500' },
    { value: 'dinner', label: 'Dinner', icon: Moon, color: 'text-indigo-500' },
    { value: 'snack', label: 'Snack', icon: Cookie, color: 'text-amber-500' },
  ];

  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If shopping list is checked and we have a recipe with ingredients, show preview modal
    if (createShoppingList && selectedRecipe && selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0) {
      // Save the meal first (without shopping list flag since we handle it separately)
      onSave(formData, false);
      // Show the shopping list preview modal
      setShowShoppingPreview(true);
    } else {
      // Normal flow - just save and close
      onSave(formData, false);
      onClose();
    }
  };

  const handleShoppingPreviewClose = () => {
    setShowShoppingPreview(false);
    onClose();
  };

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <SecondaryButton
        type="button"
        onClick={onClose}
        feature="meals"
        className="rounded-full"
      >
        Cancel
      </SecondaryButton>
      <CTAButton
        type="submit"
        form="new-meal-form"
        feature="meals"
        icon={isEditing ? <Save className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
        className="rounded-full"
      >
        {isEditing ? 'Save' : 'Create'}
      </CTAButton>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Edit Meal' : 'Plan New Meal'}
        maxWidth="3xl"
        headerGradient="bg-gradient-meals"
        footer={footerContent}
        hideCloseButton={false}
      >
        <form id="new-meal-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="relative z-50">
            <label className="block text-sm font-medium mb-2">Meal Type *</label>
            <button
              type="button"
              onClick={() => setIsMealTypeOpen(!isMealTypeOpen)}
              className="btn-touch w-full input-mobile bg-gray-900 border border-gray-600 rounded-lg focus-visible:ring-2 focus-visible:ring-purple-500 text-white flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                {(() => {
                  const selected = mealTypeOptions.find(opt => opt.value === formData.meal_type);
                  const Icon = selected?.icon || Moon;
                  return (
                    <>
                      <Icon className={`w-4 h-4 ${selected?.color || 'text-gray-400'}`} />
                      <span>{selected?.label || 'Select meal type'}</span>
                    </>
                  );
                })()}
              </div>
              <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isMealTypeOpen && (
              <div className="absolute w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden" style={{ zIndex: 70 }}>
                {mealTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, meal_type: option.value });
                        setIsMealTypeOpen(false);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-700 transition-colors text-left"
                    >
                      <Icon className={`w-4 h-4 ${option.color}`} />
                      <span className="text-white">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="relative z-50">
            <label htmlFor="field-2" className="block text-sm font-medium mb-2 text-white cursor-pointer">Recipe (Optional)</label>
            <button
              type="button"
              onClick={() => setIsRecipeSelectorOpen(!isRecipeSelectorOpen)}
              className="btn-touch w-full input-mobile bg-gray-900 border border-gray-600 rounded-lg focus-visible:ring-2 focus-visible:ring-purple-500 text-white flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-500" />
                <span>{selectedRecipe ? selectedRecipe.name : 'No recipe selected'}</span>
              </div>
              <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isRecipeSelectorOpen && (
              <div className="absolute w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden" style={{ zIndex: 70 }}>
                {/* Search Input */}
                <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 z-10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search recipes..."
                      value={recipeSearch}
                      id="field-2"
              onChange={(e) =>  setRecipeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500"
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
                              className={`btn-touch px-2 py-1 text-xs rounded-full transition-colors ${
                                cuisineFilter === cuisine
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-orange-900/30'
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
                          className="btn-touch text-xs text-orange-400 hover:underline px-1 py-0.5"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}

                  {/* Recipe Count */}
                  <div className="mt-2 text-xs text-gray-400">
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
                    className="btn-touch w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-700 transition-colors text-left"
                  >
                    <span className="text-gray-400 italic">No recipe</span>
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
                    className="btn-touch w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-orange-900/20 to-red-900/20 border-y border-orange-700 hover:from-orange-900/30 hover:to-red-900/30 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-300 font-medium text-sm">
                        Discover Recipes
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="btn-touch w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-700 transition-colors text-left border-t border-gray-700 active-press"
                    >
                      <ChefHat className="w-4 h-4 text-orange-500" />
                      <div className="flex-1">
                        <span className="text-white">{recipe.name}</span>
                        {recipe.description && (
                          <p className="text-xs text-gray-400 truncate">{recipe.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredRecipes.length === 0 && recipes.length > 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-gray-400 mb-2">
                        No recipes found
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFilters();
                        }}
                        className="btn-touch text-sm text-orange-400 hover:underline px-2 py-1"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                  {recipes.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-gray-400 italic mb-2">
                        No recipes in your library
                      </p>
                      <a
                        href="/recipes/discover"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-touch text-sm text-orange-400 hover:underline inline-flex items-center gap-1 px-2 py-1 rounded-md"
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
            <div className="flex items-center gap-2 p-3 bg-emerald-900/20 border border-emerald-800 rounded-lg">
              <input
                type="checkbox"
                id="createShoppingList"
                checked={createShoppingList}
                onChange={(e) => setCreateShoppingList(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-600 ring-offset-gray-800 bg-gray-700 border-gray-600"
              />
              <label htmlFor="createShoppingList" className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Add ingredients to Shopping List</span>
              </label>
            </div>
          )}
          <div>
            <label htmlFor="field-4" className="block text-sm font-medium mb-2 text-white cursor-pointer">Meal Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Family Dinner, Quick Lunch"
              value={formData.name || ''}
              id="field-4"
              onChange={(e) =>  setFormData({ ...formData, name: e.target.value })}
              className="w-full input-mobile bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
            />
          </div>
          <div>
            <label htmlFor="field-5" className="block text-sm font-medium mb-2 text-white cursor-pointer">Date *</label>
            <input type="date" required value={formData.scheduled_date} id="field-5"
              onChange={(e) =>  setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full input-mobile bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white" />
          </div>
          <div>
            <label htmlFor="field-6" className="block text-sm font-medium mb-2 cursor-pointer">Notes</label>
            <textarea value={formData.notes} id="field-6"
              onChange={(e) =>  setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full input-mobile bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white resize-none" />
          </div>
        </form>
      </Modal>

      {/* Shopping List Preview Modal */}
      {selectedRecipe && (
        <ShoppingListPreviewModal
          isOpen={showShoppingPreview}
          onClose={handleShoppingPreviewClose}
          ingredients={selectedRecipe.ingredients || []}
          recipeName={selectedRecipe.name}
          spaceId={spaceId}
          onSuccess={handleShoppingPreviewClose}
        />
      )}
    </>
  );
}
