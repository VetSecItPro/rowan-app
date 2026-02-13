'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { memo } from 'react';
import { UtensilsCrossed, Search, Plus, Calendar as CalendarIcon, BookOpen, TrendingUp, ShoppingBag, ChevronLeft, ChevronRight, LayoutGrid, List, ChefHat, X, CheckSquare } from 'lucide-react';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import Link from 'next/link';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
// Dynamic imports for optimized bundle splitting
import {
  MealCard,
  RecipeCard,
  NewMealModal,
  NewRecipeModal,
  IngredientReviewModal,
  GenerateListModal,
  WeekCalendarView,
  TwoWeekCalendarView,
} from '@/components/ui/DynamicMealComponents';
import { MealCardSkeleton, CalendarDaySkeleton, RecipeCardSkeleton, MobileCalendarSkeleton } from '@/components/ui/Skeleton';
import { Meal, Recipe } from '@/lib/services/meals-service';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { FeatureGateWrapper } from '@/components/subscription/FeatureGateWrapper';

// Hooks
import { useMealsData } from '@/lib/hooks/useMealsData';
import { useMealsHandlers } from '@/lib/hooks/useMealsHandlers';
import { useMealsModals } from '@/lib/hooks/useMealsModals';

// Memoized meal card component with meal planning orange color
const MemoizedMealCardWithColors = memo(({
  meal,
  onEdit,
  onDelete
}: {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="border-l-4 border-orange-500">
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
  onPlanMeal: (recipe: Recipe) => void;
}) => (
  <RecipeCard
    recipe={recipe}
    onEdit={onEdit}
    onDelete={onDelete}
    onPlanMeal={() => onPlanMeal(recipe)}
  />
));

MemoizedRecipeCard.displayName = 'MemoizedRecipeCard';

// Memoized calendar day cell component
const CalendarDayCell = memo(({
  day,
  currentMonth,
  dayMeals,
  onMealClick,
  onAddClick
}: {
  day: Date;
  currentMonth: Date;
  dayMeals: Meal[];
  onMealClick: (meal: Meal) => void;
  onAddClick: () => void;
}) => {
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isToday = isSameDay(day, new Date());

  return (
    <div
      className={`min-h-[120px] p-2 rounded-lg border-2 transition-all ${
        isCurrentMonth
          ? 'border-gray-700 bg-gray-800'
          : 'border-gray-800 bg-gray-900/50'
      } ${isToday ? 'ring-2 ring-orange-500' : ''}`}
    >
      <div className={`text-sm font-medium mb-2 ${
        isCurrentMonth
          ? isToday
            ? 'text-orange-400'
            : 'text-white'
          : 'text-gray-600'
      }`}>
        {format(day, 'd')}
      </div>

      <div className="space-y-1">
        {dayMeals.map((meal) => {
          return (
            <button
              key={meal.id}
              onClick={() => onMealClick(meal)}
              className="w-full text-left px-2 py-1 rounded text-xs bg-orange-900/20 border-l-2 border-orange-500 hover:opacity-80 transition-opacity"
            >
              <p className="font-medium text-orange-300 truncate">
                {meal.recipe?.name || meal.name || 'Untitled'}
              </p>
              <p className="text-gray-400 text-[10px] capitalize">
                {meal.meal_type}
              </p>
            </button>
          );
        })}
        {isCurrentMonth && (
          <div className="flex justify-center mt-1">
            <button
              onClick={onAddClick}
              className="px-2 py-1 text-gray-400 hover:text-orange-400 hover:bg-orange-900/20 text-[10px] rounded transition-all"
            >
              + Add Meal
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

CalendarDayCell.displayName = 'CalendarDayCell';

export default function MealsPage() {
  // ─── Hook wiring ────────────────────────────────────────────────────────────

  const modals = useMealsModals();

  const data = useMealsData(modals.showPastMeals);

  const handlers = useMealsHandlers({
    // Auth
    spaceId: data.spaceId,

    // Core data
    meals: data.meals,
    recipes: data.recipes,
    stats: data.stats,

    // React Query
    queryClient: data.queryClient,
    refetchMeals: data.refetchMeals,
    refetchRecipes: data.refetchRecipes,
    invalidateMeals: data.invalidateMeals,
    invalidateRecipes: data.invalidateRecipes,

    // Pending deletions
    setPendingDeletions: data.setPendingDeletions,

    // View / filter state setters
    setViewMode: data.setViewMode,
    setCalendarViewMode: data.setCalendarViewMode,
    setSearchQuery: data.setSearchQuery,
    setIsSearchTyping: data.setIsSearchTyping,
    setCurrentMonth: data.setCurrentMonth,
    setCurrentWeek: data.setCurrentWeek,

    // Search ref
    searchInputRef: data.searchInputRef,

    // Modal state (from useMealsModals)
    editingMeal: modals.editingMeal,
    setEditingMeal: modals.setEditingMeal,
    editingRecipe: modals.editingRecipe,
    setEditingRecipe: modals.setEditingRecipe,
    setIsModalOpen: modals.setIsModalOpen,
    setIsRecipeModalOpen: modals.setIsRecipeModalOpen,
    setRecipeModalInitialTab: modals.setRecipeModalInitialTab,
    isIngredientReviewOpen: modals.isIngredientReviewOpen,
    setIsIngredientReviewOpen: modals.setIsIngredientReviewOpen,
    pendingMealData: modals.pendingMealData,
    setPendingMealData: modals.setPendingMealData,
    selectedRecipeForReview: modals.selectedRecipeForReview,
    setSelectedRecipeForReview: modals.setSelectedRecipeForReview,
    setIsGenerateListOpen: modals.setIsGenerateListOpen,
    setShowPastMeals: modals.setShowPastMeals,

    // Modal open/close callbacks
    handleOpenMealModal: modals.handleOpenMealModal,
    handleCloseMealModal: modals.handleCloseMealModal,
    handleOpenRecipeModal: modals.handleOpenRecipeModal,
    handleCloseRecipeModal: modals.handleCloseRecipeModal,
    handleEscapeClose: modals.handleEscapeClose,
  });

  // ─── Destructure for clean JSX access ───────────────────────────────────────

  const {
    spaceId,
    stats,
    loading,
    viewMode,
    calendarViewMode,
    searchQuery,
    isSearchTyping,
    currentMonth,
    currentWeek,
    searchInputRef,
    filteredMeals,
    filteredRecipes,
    calendarDays,
    getMealsForDate,
    meals,
    recipes,
    setCalendarViewMode,
    setSearchQuery,
    setIsSearchTyping,
  } = data;

  const {
    isModalOpen,
    editingMeal,
    isRecipeModalOpen,
    editingRecipe,
    recipeModalInitialTab,
    isIngredientReviewOpen,
    selectedRecipeForReview,
    isGenerateListOpen,
    showPastMeals,
    setShowPastMeals,
  } = modals;

  const {
    handleCreateMeal,
    handleDeleteMeal,
    handleCreateRecipe,
    handleDeleteRecipe,
    handleSearchChange,
    handleSetCalendarView,
    handleSetListView,
    handleSetRecipesView,
    handlePreviousMonth,
    handleNextMonth,
    handleWeekChange,
    handleAddMealForDate,
    handleThisWeekClick,
    handleNextTwoWeeksClick,
    handleSavedRecipesClick,
    handleMealClick,
    handleAddMealClick,
    handleEditRecipe,
    handlePlanMealFromRecipe,
    handleEditMeal,
    handleRecipeAddedFromDiscover,
    handleIngredientConfirm,
    handleBulkDelete,
    handleBulkGenerateList,
    handlePullToRefresh,
  } = handlers;

  const { handleCloseMealModal, handleCloseRecipeModal, handleOpenRecipeModal, handleOpenMealModal, handleOpenRecipeDiscover } = modals;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <FeatureGateWrapper
      feature="mealPlanning"
      title="Meal Planning"
      description="Plan your family meals, save recipes, and automatically generate shopping lists. Upgrade to Pro to unlock this feature."
      loadingFallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-700" />
            <div className="h-4 w-32 rounded bg-gray-700" />
          </div>
        </div>
      }
    >
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Meal Planning' }]}>
      <PullToRefresh onRefresh={handlePullToRefresh}>
      <div className="p-4 sm:p-6 md:p-8 lg:p-5">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-meals flex items-center justify-center flex-shrink-0"><UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
              <div>
                <h1 className="text-xl sm:text-3xl md:text-3xl lg:text-4xl font-bold bg-gradient-meals bg-clip-text text-transparent">Meal Planning</h1>
                <p className="text-sm sm:text-base text-gray-400">Plan your meals together</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* View Toggle */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl border border-orange-700 w-full sm:w-auto">
                <button
                    onClick={handleSetCalendarView}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium min-w-[90px] sm:min-w-[110px] ${
                      viewMode === 'calendar'
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                        : 'text-gray-300 hover:bg-orange-500 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-sm">Calendar</span>
                  </button>
                <button
                    onClick={handleSetListView}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium min-w-[90px] sm:min-w-[110px] ${
                      viewMode === 'list'
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                        : 'text-gray-300 hover:bg-orange-500 hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span className="text-sm">List</span>
                  </button>
                <button
                    onClick={handleSetRecipesView}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium min-w-[90px] sm:min-w-[110px] ${
                      viewMode === 'recipes'
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                        : 'text-gray-300 hover:bg-orange-500 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm">Recipes</span>
                  </button>
              </div>

              {/* Meal Actions Toggle */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl border border-orange-700 w-full sm:w-auto">
                <button
                  onClick={handleOpenRecipeModal}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] text-gray-300 hover:bg-orange-500 hover:text-white"
                >
                  <ChefHat className="w-4 h-4" />
                  <span className="text-sm">Recipe</span>
                </button>
                <button
                  onClick={handleOpenMealModal}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] bg-gradient-to-r from-orange-600 to-red-600 text-white hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Meal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Dashboard */}
          <CollapsibleStatsGrid
            icon={UtensilsCrossed}
            title="Meals Stats"
            summary={`${stats.thisWeek} this week • ${stats.savedRecipes} recipes`}
            iconGradient="bg-gradient-meals"
          >
            {/* This Week Card */}
            <button
              onClick={handleThisWeekClick}
              className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium">This Week</h3>
                <div className="w-12 h-12 bg-gradient-meals rounded-xl flex items-center justify-center"><CalendarIcon className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.thisWeek}</p>
                {stats.thisWeek > 0 && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <CalendarIcon className="w-3 h-3" />
                    <span className="text-xs font-medium">Planned</span>
                  </div>
                )}
              </div>
            </button>

            {/* Next Two Weeks Card */}
            <button
              onClick={handleNextTwoWeeksClick}
              className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium">Next Two Weeks</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.nextWeek}</p>
                {stats.nextWeek > 0 && (
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">Upcoming</span>
                  </div>
                )}
              </div>
            </button>

            {/* Saved Recipes Card */}
            <button
              onClick={handleSavedRecipesClick}
              className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium">Saved Recipes</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><BookOpen className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.savedRecipes}</p>
                {stats.savedRecipes > 0 && (
                  <div className="flex items-center gap-1 text-blue-400">
                    <BookOpen className="w-3 h-3" />
                    <span className="text-xs font-medium">In library</span>
                  </div>
                )}
              </div>
            </button>

            {/* Shopping Items Card */}
            <Link
              href="/shopping"
              className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 transition-all duration-200 cursor-pointer block"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium">Shopping Items</h3>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.shoppingItems}</p>
                {stats.shoppingItems > 0 && (
                  <div className="flex items-center gap-1 text-purple-400">
                    <ShoppingBag className="w-3 h-3" />
                    <span className="text-xs font-medium">From recipes</span>
                  </div>
                )}
              </div>
            </Link>
          </CollapsibleStatsGrid>

          {/* Search Bar - No container box on mobile */}
          <div className="sm:bg-gray-800 sm:border sm:border-gray-700 sm:rounded-xl sm:p-4">
            <div className="apple-search-container meals-search">
              <Search className="apple-search-icon" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder={viewMode === 'recipes' ? 'Search recipes...' : 'Search meals...'}
                value={searchQuery}
                onChange={handleSearchChange}
                className={`apple-search-input w-full ${isSearchTyping ? 'typing' : ''}`}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchTyping(false);
                  }}
                  className={`apple-search-clear ${searchQuery ? 'visible' : ''}`}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Meals/Recipes Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            {viewMode !== 'calendar' && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {viewMode === 'recipes' ? `Saved Recipes (${filteredRecipes.length})` : `Planned Meals (${filteredMeals.length})`}
                  </h2>
                  <span className="px-3 py-1 bg-orange-900/30 border border-orange-700 text-orange-300 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap">
                    {format(new Date(), 'MMM yyyy')}
                  </span>
                </div>

                {/* Show Past Meals Toggle (only in list view) */}
                {viewMode === 'list' && (
                  <button
                    onClick={() => setShowPastMeals(!showPastMeals)}
                    className={`hidden sm:flex px-4 py-2 rounded-full transition-colors items-center gap-2 text-sm font-medium whitespace-nowrap ${
                      showPastMeals
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={showPastMeals ? 'Hide past meals' : 'Show past meals'}
                  >
                    <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {showPastMeals ? 'Hide Past' : 'Show Past'}
                  </button>
                )}
              </div>
            )}

            <div>
              {loading ? (
                viewMode === 'recipes' ? (
                  /* Loading Skeletons for Recipes */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <RecipeCardSkeleton key={i} />
                    ))}
                  </div>
                ) : viewMode === 'calendar' ? (
                  /* Loading Skeletons for Calendar */
                  <div>
                    {/* Toggle skeleton */}
                    <div className="flex items-center justify-center mb-6 px-2 sm:px-0">
                      <div className="h-12 w-full sm:w-[400px] bg-gray-700 rounded-xl animate-pulse" />
                    </div>
                    {/* Mobile: Stacked card skeleton */}
                    <div className="sm:hidden">
                      <MobileCalendarSkeleton />
                    </div>
                    {/* Desktop: Grid skeleton */}
                    <div className="hidden sm:grid grid-cols-7 gap-3">
                      {[...Array(7)].map((_, i) => (
                        <CalendarDaySkeleton key={i} />
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Loading Skeletons for List */
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <MealCardSkeleton key={i} />
                    ))}
                  </div>
                )
              ) : viewMode === 'recipes' ? (
              /* Recipes View */
              filteredRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
                    <ChefHat className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {searchQuery ? 'No matching recipes' : 'Your recipe collection awaits'}
                  </h3>
                  <p className="text-sm text-gray-400 max-w-sm mb-6">
                    {searchQuery
                      ? 'Try adjusting your search to find what you\'re looking for.'
                      : 'Save your favorite recipes to quickly plan meals and generate shopping lists.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleOpenRecipeModal}
                      className="px-5 py-2.5 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors inline-flex items-center gap-2 text-sm font-medium shadow-lg shadow-orange-600/20"
                    >
                      <ChefHat className="w-4 h-4" />
                      Add Recipe
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
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
              <div className="w-full">
                {/* Calendar View Mode Selector - Pill-shaped on Mobile */}
                <div className="flex items-center justify-center mb-3 sm:mb-6 px-2 sm:px-0">
                  <div className="flex items-center w-auto inline-flex gap-0.5 sm:gap-1 p-1 sm:p-1.5 bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-full sm:rounded-xl border border-orange-700">
                    <button
                      onClick={() => setCalendarViewMode('week')}
                      className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full sm:rounded-lg transition-all font-medium text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                        calendarViewMode === 'week'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                          : 'text-gray-300 hover:bg-orange-900/50'
                      }`}
                    >
                      <span className="hidden sm:inline">Current Week</span>
                      <span className="sm:hidden">Week</span>
                    </button>
                    <button
                      onClick={() => setCalendarViewMode('2weeks')}
                      className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full sm:rounded-lg transition-all font-medium text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                        calendarViewMode === '2weeks'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                          : 'text-gray-300 hover:bg-orange-900/50'
                      }`}
                    >
                      <span className="hidden sm:inline">Two Weeks</span>
                      <span className="sm:hidden">2 Weeks</span>
                    </button>
                    <button
                      onClick={() => setCalendarViewMode('month')}
                      className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full sm:rounded-lg transition-all font-medium text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                        calendarViewMode === 'month'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                          : 'text-gray-300 hover:bg-orange-900/50'
                      }`}
                    >
                      Month
                    </button>
                  </div>
                </div>

                {calendarViewMode === 'week' ? (
                  /* Week Calendar View */
                  <WeekCalendarView
                    currentWeek={currentWeek}
                    meals={filteredMeals}
                    onWeekChange={handleWeekChange}
                    onMealClick={handleMealClick}
                    onAddMeal={handleAddMealForDate}
                    onBulkDelete={handleBulkDelete}
                    onBulkGenerateList={handleBulkGenerateList}
                    onGenerateList={() => modals.setIsGenerateListOpen(true)}
                  />
                ) : calendarViewMode === '2weeks' ? (
                  /* Two Week Calendar View */
                  <TwoWeekCalendarView
                    currentWeek={currentWeek}
                    meals={filteredMeals}
                    onWeekChange={handleWeekChange}
                    onMealClick={handleMealClick}
                    onAddMeal={handleAddMealForDate}
                    onBulkDelete={handleBulkDelete}
                    onBulkGenerateList={handleBulkGenerateList}
                    onGenerateList={() => modals.setIsGenerateListOpen(true)}
                  />
                ) : (
                  /* Month Calendar View */
                  <div className="w-full space-y-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handlePreviousMonth}
                        className="p-2.5 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-400" />
                      </button>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {format(currentMonth, 'MMMM yyyy')}
                      </h3>
                      <button
                        onClick={handleNextMonth}
                        className="p-2.5 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Mobile: Week-by-Week List View */}
                    <div className="sm:hidden space-y-4">
                      {(() => {
                        // Group calendar days by week
                        const weeks: Date[][] = [];
                        for (let i = 0; i < calendarDays.length; i += 7) {
                          weeks.push(calendarDays.slice(i, i + 7));
                        }
                        return weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-400 px-1">
                              Week of {format(week[0], 'MMM d')}
                            </h4>
                            <div className="space-y-2">
                              {week.map((day) => {
                                const dayMeals = getMealsForDate(day);
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isToday = isSameDay(day, new Date());

                                if (!isCurrentMonth) return null;

                                return (
                                  <div
                                    key={day.toISOString()}
                                    className={`rounded-xl border-2 p-3 transition-all ${
                                      isToday
                                        ? 'border-orange-500 bg-orange-900/10'
                                        : 'border-gray-700 bg-gray-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${isToday ? 'text-orange-400' : 'text-gray-400'}`}>
                                          {format(day, 'EEE')}
                                        </span>
                                        <span className={`text-lg font-bold ${isToday ? 'text-orange-400' : 'text-white'}`}>
                                          {format(day, 'd')}
                                        </span>
                                        {isToday && (
                                          <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">Today</span>
                                        )}
                                      </div>
                                      <button
                                        onClick={handleAddMealClick}
                                        className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {dayMeals.length > 0 && (
                                      <div className="space-y-1.5">
                                        {dayMeals.map((meal) => (
                                          <button
                                            key={meal.id}
                                            onClick={() => handleMealClick(meal)}
                                            className="w-full text-left px-3 py-2 rounded-lg text-sm bg-orange-900/20 border-l-4 border-orange-500 hover:shadow-md transition-all"
                                          >
                                            <p className="font-medium text-white">
                                              {meal.recipe?.name || meal.name || 'Untitled'}
                                            </p>
                                            <p className="text-xs text-orange-400 capitalize">
                                              {meal.meal_type}
                                            </p>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Desktop: Calendar Grid */}
                    <div className="hidden sm:block">
                      <div className="grid grid-cols-7 gap-2">
                        {/* Day headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                            {day}
                          </div>
                        ))}

                        {/* Calendar days */}
                        {calendarDays.map((day) => {
                          const dayMeals = getMealsForDate(day);
                          return (
                            <CalendarDayCell
                              key={day.toISOString()}
                              day={day}
                              currentMonth={currentMonth}
                              dayMeals={dayMeals}
                              onMealClick={handleMealClick}
                              onAddClick={handleAddMealClick}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* List View */
              filteredMeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
                    <UtensilsCrossed className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {searchQuery ? 'No matching meals' : 'Plan your week of meals'}
                  </h3>
                  <p className="text-sm text-gray-400 max-w-sm mb-6">
                    {searchQuery
                      ? 'Try adjusting your search to find what you\'re looking for.'
                      : 'Plan meals ahead of time to eat healthier and reduce stress.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleOpenMealModal}
                      className="px-5 py-2.5 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors inline-flex items-center gap-2 text-sm font-medium shadow-lg shadow-orange-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      Plan a Meal
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMeals.map((meal) => {
                    return (
                      <MemoizedMealCardWithColors
                        key={meal.id}
                        meal={meal}
                        onEdit={handleEditMeal}
                        onDelete={handleDeleteMeal}
                      />
                    );
                  })}
                </div>
              )
            )}
            </div>
          </div>
        </div>
      </div>
      {/* Modals */}
      {spaceId && (
        <NewMealModal
          isOpen={isModalOpen}
          onClose={handleCloseMealModal}
          onSave={handleCreateMeal}
          editMeal={editingMeal}
          spaceId={spaceId}
          recipes={recipes}
          onOpenRecipeDiscover={handleOpenRecipeDiscover}
        />
      )}
      {spaceId && (
        <NewRecipeModal
          isOpen={isRecipeModalOpen}
          onClose={handleCloseRecipeModal}
          onSave={handleCreateRecipe}
          editRecipe={editingRecipe}
          spaceId={spaceId}
          initialTab={recipeModalInitialTab}
          onRecipeAdded={handleRecipeAddedFromDiscover}
        />
      )}
      {selectedRecipeForReview && (
        <IngredientReviewModal
          isOpen={isIngredientReviewOpen}
          onClose={() => {
            modals.setIsIngredientReviewOpen(false);
            modals.setPendingMealData(null);
            modals.setSelectedRecipeForReview(null);
          }}
          onConfirm={handleIngredientConfirm}
          ingredients={selectedRecipeForReview.ingredients}
          recipeName={selectedRecipeForReview.name}
        />
      )}
      {spaceId && (
        <GenerateListModal
          isOpen={isGenerateListOpen}
          onClose={() => modals.setIsGenerateListOpen(false)}
          meals={meals}
          spaceId={spaceId}
          onSuccess={() => data.invalidateMeals()}
        />
      )}
      </PullToRefresh>
    </FeatureLayout>
    </FeatureGateWrapper>
  );
}
