'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { UtensilsCrossed, Search, Plus, Calendar as CalendarIcon, BookOpen, TrendingUp, ShoppingBag, ChevronLeft, ChevronRight, LayoutGrid, List, ChefHat } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { MealCard } from '@/components/meals/MealCard';
import { NewMealModal } from '@/components/meals/NewMealModal';
import { NewRecipeModal } from '@/components/meals/NewRecipeModal';
import { RecipeCard } from '@/components/meals/RecipeCard';
import GuidedMealCreation from '@/components/guided/GuidedMealCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { mealsService, Meal, CreateMealInput, Recipe, CreateRecipeInput } from '@/lib/services/meals-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';

type ViewMode = 'calendar' | 'list' | 'recipes';

// Memoized meal card component with user colors
const MemoizedMealCardWithColors = memo(({
  meal,
  onEdit,
  onDelete,
  colors
}: {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
  colors: { border: string; bg: string; text: string };
}) => (
  <div className={`border-l-4 ${colors.border}`}>
    <MealCard
      meal={meal}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  </div>
));

MemoizedMealCardWithColors.displayName = 'MemoizedMealCardWithColors';

// Memoized recipe card component
const MemoizedRecipeCard = memo(({
  recipe,
  onEdit,
  onDelete,
  onPlanMeal
}: {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onPlanMeal: () => void;
}) => (
  <RecipeCard
    recipe={recipe}
    onEdit={onEdit}
    onDelete={onDelete}
    onPlanMeal={onPlanMeal}
  />
));

MemoizedRecipeCard.displayName = 'MemoizedRecipeCard';

// Memoized calendar day cell component
const CalendarDayCell = memo(({
  day,
  index,
  currentMonth,
  dayMeals,
  getUserColor,
  onMealClick,
  onAddClick
}: {
  day: Date;
  index: number;
  currentMonth: Date;
  dayMeals: Meal[];
  getUserColor: (userId: string) => { border: string; bg: string; text: string };
  onMealClick: (meal: Meal) => void;
  onAddClick: () => void;
}) => {
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isToday = isSameDay(day, new Date());

  return (
    <div
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
              onClick={() => onMealClick(meal)}
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
            onClick={onAddClick}
            className="w-full text-center py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
});

CalendarDayCell.displayName = 'CalendarDayCell';

export default function MealsPage() {
  const { currentSpace, user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ thisWeek: 0, savedRecipes: 0, upcoming: 0, shoppingItems: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);

  // Memoized user color mapping
  const getUserColor = useCallback((userId: string) => {
    const userColors: Record<string, { border: string; bg: string; text: string }> = {
      'user-1': { border: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
      'user-2': { border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    };
    return userColors[userId] || userColors['user-1'];
  }, []);

  // Memoized filtered meals based on search query
  const filteredMeals = useMemo(() => {
    if (viewMode === 'recipes') return [];

    let filtered = meals;
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.recipe?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [meals, searchQuery, viewMode]);

  // Memoized filtered recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (viewMode !== 'recipes') return [];

    let filtered = recipes;
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return filtered;
  }, [recipes, searchQuery, viewMode]);

  // Memoized calendar days calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Memoized meals grouped by date for calendar view
  const mealsByDate = useMemo(() => {
    const grouped = new Map<string, Meal[]>();
    meals.forEach(meal => {
      const dateKey = format(new Date(meal.scheduled_date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(meal);
    });
    return grouped;
  }, [meals]);

  // Optimized function to get meals for a specific date
  const getMealsForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return mealsByDate.get(dateKey) || [];
  }, [mealsByDate]);

  // Load meals callback
  const loadMeals = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [mealsData, statsData, userProgressResult] = await Promise.all([
        mealsService.getMeals(currentSpace.id),
        mealsService.getMealStats(currentSpace.id),
        getUserProgress(user.id),
      ]);
      setMeals(mealsData);
      setStats(statsData);

      // Check if user has completed the guided meal flow
      const userProgress = userProgressResult.success ? userProgressResult.data : null;
      if (userProgress) {
        setHasCompletedGuide(userProgress.first_meal_planned);
      }

      // Show guided flow if no meals exist, user hasn't completed the guide, AND user hasn't skipped it
      if (
        mealsData.length === 0 &&
        !userProgress?.first_meal_planned &&
        !userProgress?.skipped_meal_guide
      ) {
        setShowGuidedFlow(true);
      }
    } catch (error) {
      console.error('Failed to load meals:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  // Load recipes callback
  const loadRecipes = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace) {
      return;
    }

    try {
      const recipesData = await mealsService.getRecipes(currentSpace.id);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  }, [currentSpace]);

  useEffect(() => {
    loadMeals();
    loadRecipes();
  }, [loadMeals, loadRecipes]);

  // Memoized handlers
  const handleCreateMeal = useCallback(async (mealData: CreateMealInput) => {
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
  }, [editingMeal, loadMeals]);

  const handleDeleteMeal = useCallback(async (mealId: string) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;
    try {
      await mealsService.deleteMeal(mealId);
      loadMeals();
    } catch (error) {
      console.error('Failed to delete meal:', error);
    }
  }, [loadMeals]);

  const handleCreateRecipe = useCallback(async (recipeData: CreateRecipeInput) => {
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
  }, [editingRecipe, loadRecipes]);

  const handleDeleteRecipe = useCallback(async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await mealsService.deleteRecipe(recipeId);
      loadRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  }, [loadRecipes]);

  // Search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // View mode handlers
  const handleSetCalendarView = useCallback(() => setViewMode('calendar'), []);
  const handleSetListView = useCallback(() => setViewMode('list'), []);
  const handleSetRecipesView = useCallback(() => setViewMode('recipes'), []);

  // Calendar navigation handlers
  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  // Modal handlers
  const handleOpenMealModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseMealModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMeal(null);
  }, []);

  const handleOpenRecipeModal = useCallback(() => setIsRecipeModalOpen(true), []);
  const handleCloseRecipeModal = useCallback(() => {
    setIsRecipeModalOpen(false);
    setEditingRecipe(null);
  }, []);

  // Calendar day click handlers
  const handleMealClick = useCallback((meal: Meal) => {
    setEditingMeal(meal);
    setIsModalOpen(true);
  }, []);

  const handleAddMealClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Recipe card handlers
  const handleEditRecipe = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsRecipeModalOpen(true);
  }, []);

  const handlePlanMealFromRecipe = useCallback(() => {
    setEditingMeal(null);
    setIsModalOpen(true);
  }, []);

  // Meal card handlers
  const handleEditMeal = useCallback((meal: Meal) => {
    setEditingMeal(meal);
    setIsModalOpen(true);
  }, []);

  const handleGuidedFlowComplete = useCallback(() => {
    setShowGuidedFlow(false);
    setHasCompletedGuide(true);
    loadMeals(); // Reload to show newly created meal
  }, [loadMeals]);

  const handleGuidedFlowSkip = useCallback(async () => {
    setShowGuidedFlow(false);

    // Mark the guide as skipped in user progress
    if (user) {
      try {
        await markFlowSkipped(user.id, 'meal_guide');
      } catch (error) {
        console.error('Failed to mark meal guide as skipped:', error);
      }
    }
  }, [user]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Meal Planning' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-meals flex items-center justify-center"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-meals bg-clip-text text-transparent">Meal Planning</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Plan your meals together</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* View Toggle */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl border border-orange-200 dark:border-orange-700 w-full sm:w-auto">
                <button
                  onClick={handleSetCalendarView}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] ${
                    viewMode === 'calendar'
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm">Calendar</span>
                </button>
                <button
                  onClick={handleSetListView}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm">List</span>
                </button>
                <button
                  onClick={handleSetRecipesView}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] ${
                    viewMode === 'recipes'
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">Recipes</span>
                </button>
              </div>
              <button onClick={handleOpenRecipeModal} className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                <ChefHat className="w-5 h-5" />
                <span className="hidden sm:inline">New Recipe</span>
                <span className="sm:hidden">Recipe</span>
              </button>
              <button onClick={handleOpenMealModal} className="px-4 py-2 sm:px-6 sm:py-3 shimmer-meals text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Meal</span>
                <span className="sm:hidden">Meal</span>
              </button>
            </div>
          </div>

          {/* Guided Creation - MOVED TO TOP */}
          {!loading && showGuidedFlow && (
            <GuidedMealCreation
              onComplete={handleGuidedFlowComplete}
              onSkip={handleGuidedFlowSkip}
            />
          )}

          {/* Stats Dashboard - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
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
          )}

          {/* Search Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={viewMode === 'recipes' ? 'Search recipes...' : 'Search meals...'}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
          )}

          {/* Meals/Recipes Section - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            {viewMode !== 'calendar' && (
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {viewMode === 'recipes' ? `Saved Recipes (${filteredRecipes.length})` : `Planned Meals (${filteredMeals.length})`}
                </h2>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>
            )}

            <div className={viewMode === 'calendar' ? 'h-[600px] overflow-y-auto' : 'max-h-[600px] overflow-y-auto'}>
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
                      onClick={handleOpenRecipeModal}
                      className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                    >
                      <ChefHat className="w-5 h-5" />
                      Create Recipe
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredRecipes.map((recipe) => (
                    <MemoizedRecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onEdit={handleEditRecipe}
                      onDelete={handleDeleteRecipe}
                      onPlanMeal={handlePlanMealFromRecipe}
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
                    onClick={handlePreviousMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <button
                    onClick={handleNextMonth}
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
                  {calendarDays.map((day, index) => {
                    const dayMeals = getMealsForDate(day);
                    return (
                      <CalendarDayCell
                        key={index}
                        day={day}
                        index={index}
                        currentMonth={currentMonth}
                        dayMeals={dayMeals}
                        getUserColor={getUserColor}
                        onMealClick={handleMealClick}
                        onAddClick={handleAddMealClick}
                      />
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
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={handleOpenMealModal}
                        className="px-6 py-3 shimmer-meals text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Plan Meal
                      </button>
                      {!hasCompletedGuide && (
                        <button
                          onClick={() => setShowGuidedFlow(true)}
                          className="px-6 py-3 bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                        >
                          <UtensilsCrossed className="w-5 h-5" />
                          Try Guided Creation
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMeals.map((meal) => {
                    const colors = getUserColor(meal.created_by);
                    return (
                      <MemoizedMealCardWithColors
                        key={meal.id}
                        meal={meal}
                        onEdit={handleEditMeal}
                        onDelete={handleDeleteMeal}
                        colors={colors}
                      />
                    );
                  })}
                </div>
              )
            )}
            </div>
          </div>
          )}
        </div>
      </div>
      {currentSpace && (
        <>
          <NewMealModal isOpen={isModalOpen} onClose={handleCloseMealModal} onSave={handleCreateMeal} editMeal={editingMeal} spaceId={currentSpace.id} />
          <NewRecipeModal isOpen={isRecipeModalOpen} onClose={handleCloseRecipeModal} onSave={handleCreateRecipe} editRecipe={editingRecipe} spaceId={currentSpace.id} />
        </>
      )}
    </FeatureLayout>
  );
}
