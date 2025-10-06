'use client';

import { useState, useEffect } from 'react';
import { UtensilsCrossed, Search, Plus, Calendar as CalendarIcon, BookOpen, TrendingUp, ShoppingBag, ChevronLeft, ChevronRight, LayoutGrid, List, ChefHat } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { MealCard } from '@/components/meals/MealCard';
import { NewMealModal } from '@/components/meals/NewMealModal';
import { NewRecipeModal } from '@/components/meals/NewRecipeModal';
import { RecipeCard } from '@/components/meals/RecipeCard';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { mealsService, Meal, CreateMealInput, Recipe, CreateRecipeInput } from '@/lib/services/meals-service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';

type ViewMode = 'calendar' | 'list' | 'recipes';

export default function MealsPage() {
  const { currentSpace, user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ thisWeek: 0, savedRecipes: 0, upcoming: 0, shoppingItems: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadMeals();
    loadRecipes();
  }, [currentSpace.id]);

  useEffect(() => {
    if (viewMode === 'recipes') {
      let filtered = recipes;
      if (searchQuery) {
        filtered = filtered.filter(r =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      setFilteredRecipes(filtered);
    } else {
      let filtered = meals;
      if (searchQuery) {
        filtered = filtered.filter(m => m.recipe?.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.notes?.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      setFilteredMeals(filtered);
    }
  }, [meals, recipes, searchQuery, viewMode]);

  async function loadMeals() {
    try {
      setLoading(true);
      const [mealsData, statsData] = await Promise.all([mealsService.getMeals(currentSpace.id), mealsService.getMealStats(currentSpace.id)]);
      setMeals(mealsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load meals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMeal(mealData: CreateMealInput) {
    try {
      if (editingMeal) {
        await mealsService.updateMeal(editingMeal.id, mealData);
      } else {
        await mealsService.createMeal(mealData);
      }
      loadMeals();
      setEditingMeal(null);
    } catch (error) {
      console.error('Failed to save meal:', error);
    }
  }

  async function handleDeleteMeal(mealId: string) {
    if (!confirm('Are you sure you want to delete this meal?')) return;
    try {
      await mealsService.deleteMeal(mealId);
      loadMeals();
    } catch (error) {
      console.error('Failed to delete meal:', error);
    }
  }

  async function loadRecipes() {
    try {
      const recipesData = await mealsService.getRecipes(currentSpace.id);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  }

  async function handleCreateRecipe(recipeData: CreateRecipeInput) {
    try {
      if (editingRecipe) {
        await mealsService.updateRecipe(editingRecipe.id, recipeData);
      } else {
        await mealsService.createRecipe(recipeData);
      }
      loadRecipes();
      setEditingRecipe(null);
    } catch (error) {
      console.error('Failed to save recipe:', error);
    }
  }

  async function handleDeleteRecipe(recipeId: string) {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await mealsService.deleteRecipe(recipeId);
      loadRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  }

  // Calendar helper functions
  const getUserColor = (userId: string) => {
    // Mock user colors - in production, would come from user preferences
    const userColors: Record<string, { border: string; bg: string; text: string }> = {
      'user-1': { border: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
      'user-2': { border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    };
    return userColors[userId] || userColors['user-1'];
  };

  const getMealsForDate = (date: Date) => {
    return meals.filter(meal => isSameDay(new Date(meal.scheduled_date), date));
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Meal Planning' }]}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-meals flex items-center justify-center"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-meals bg-clip-text text-transparent">Meal Planning</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Plan your meals together</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsRecipeModalOpen(true)} className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                New Recipe
              </button>
              <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Meal
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">This Week</h3>
                <div className="w-12 h-12 bg-gradient-meals rounded-xl flex items-center justify-center"><CalendarIcon className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Saved Recipes</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><BookOpen className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.savedRecipes}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Upcoming</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.upcoming}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Shopping Items</h3>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.shoppingItems}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={viewMode === 'recipes' ? 'Search recipes...' : 'Search meals...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {viewMode === 'recipes' ? `Recipe Library (${filteredRecipes.length})` : `Planned Meals (${filteredMeals.length})`}
              </h2>
              <div className="flex items-center gap-2 p-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-200 dark:border-purple-700">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[110px] ${
                    viewMode === 'calendar'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm">Calendar</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[110px] ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm">List</span>
                </button>
                <button
                  onClick={() => setViewMode('recipes')}
                  className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[110px] ${
                    viewMode === 'recipes'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">Recipes</span>
                </button>
              </div>
            </div>

            <div className="min-h-[600px]">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading meals...</p>
                </div>
              ) : viewMode === 'recipes' ? (
              /* Recipes View */
              filteredRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No recipes saved</p>
                  <p className="text-gray-500 dark:text-gray-500 mb-6">
                    {searchQuery ? 'Try adjusting your search' : 'Create your first recipe!'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setIsRecipeModalOpen(true)}
                      className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                    >
                      <ChefHat className="w-5 h-5" />
                      Create Recipe
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onEdit={(r) => {
                        setEditingRecipe(r);
                        setIsRecipeModalOpen(true);
                      }}
                      onDelete={handleDeleteRecipe}
                      onPlanMeal={(r) => {
                        setEditingMeal(null);
                        setIsModalOpen(true);
                        // TODO: Pre-select this recipe in the meal modal
                      }}
                    />
                  ))}
                </div>
              )
            ) : viewMode === 'calendar' ? (
              /* Calendar View */
              <div>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {getCalendarDays().map((day, index) => {
                    const dayMeals = getMealsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={index}
                        className={`min-h-[120px] p-2 rounded-lg border-2 transition-all ${
                          isCurrentMonth
                            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
                        } ${isToday ? 'ring-2 ring-purple-500' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-2 ${
                          isCurrentMonth
                            ? isToday
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-gray-900 dark:text-white'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}>
                          {format(day, 'd')}
                        </div>

                        <div className="space-y-1">
                          {dayMeals.map((meal) => {
                            const colors = getUserColor(meal.created_by);
                            return (
                              <button
                                key={meal.id}
                                onClick={() => {
                                  setEditingMeal(meal);
                                  setIsModalOpen(true);
                                }}
                                className={`w-full text-left px-2 py-1 rounded text-xs ${colors.bg} border-l-2 ${colors.border} hover:opacity-80 transition-opacity`}
                              >
                                <p className={`font-medium ${colors.text} truncate`}>
                                  {meal.recipe?.name || 'Untitled'}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-[10px]">
                                  {meal.meal_type}
                                </p>
                              </button>
                            );
                          })}
                          {dayMeals.length === 0 && isCurrentMonth && (
                            <button
                              onClick={() => setIsModalOpen(true)}
                              className="w-full text-center py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* List View */
              filteredMeals.length === 0 ? (
                <div className="text-center py-12">
                  <UtensilsCrossed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No meals planned</p>
                  <p className="text-gray-500 dark:text-gray-500 mb-6">
                    {searchQuery ? 'Try adjusting your search' : 'Start planning your meals!'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Plan Meal
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMeals.map((meal) => {
                    const colors = getUserColor(meal.created_by);
                    return (
                      <div key={meal.id} className={`border-l-4 ${colors.border}`}>
                        <MealCard
                          meal={meal}
                          onEdit={(m) => {
                            setEditingMeal(m);
                            setIsModalOpen(true);
                          }}
                          onDelete={handleDeleteMeal}
                        />
                      </div>
                    );
                  })}
                </div>
              )
            )}
            </div>
          </div>
        </div>
      </div>
      <NewMealModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingMeal(null); }} onSave={handleCreateMeal} editMeal={editingMeal} spaceId={currentSpace.id} />
      <NewRecipeModal isOpen={isRecipeModalOpen} onClose={() => { setIsRecipeModalOpen(false); setEditingRecipe(null); }} onSave={handleCreateRecipe} editRecipe={editingRecipe} spaceId={currentSpace.id} />
    </FeatureLayout>
  );
}
