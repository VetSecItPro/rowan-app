'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UtensilsCrossed, Search, Plus, Calendar as CalendarIcon, BookOpen, TrendingUp, ShoppingBag, ChevronLeft, ChevronRight, LayoutGrid, List, ChefHat, X, CheckSquare } from 'lucide-react';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import Link from 'next/link';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { CTAButton } from '@/components/ui/EnhancedButton';
import { logger } from '@/lib/logger';
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
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { mealsService, Meal, CreateMealInput, Recipe, CreateRecipeInput } from '@/lib/services/meals-service';
import { shoppingService } from '@/lib/services/shopping-service';
import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { showSuccess, showError } from '@/lib/utils/toast';
import { toast } from 'sonner';
import { FeatureGateWrapper } from '@/components/subscription/FeatureGateWrapper';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/react-query/query-client';

type ViewMode = 'calendar' | 'list' | 'recipes';
type CalendarViewMode = 'week' | '2weeks' | 'month';
type RecipeWithStringIngredients = Omit<Recipe, 'ingredients'> & { ingredients: string[] };

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
      } ${isToday ? 'ring-2 ring-purple-500' : ''}`}
    >
      <div className={`text-sm font-medium mb-2 ${
        isCurrentMonth
          ? isToday
            ? 'text-purple-400'
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
  // SECURITY: Check feature access FIRST, before loading any data
  const { hasAccess, isLoading: gateLoading } = useFeatureGate('mealPlanning');

  const { currentSpace, user } = useAuthWithSpaces();
  const queryClient = useQueryClient();
  const spaceId = currentSpace?.id;

  // React Query: fetch meals + stats
  // IMPORTANT: Only fetch if user has access (prevents data loading for free users)
  const {
    data: mealsData,
    isLoading: mealsLoading,
    refetch: refetchMeals,
  } = useQuery({
    queryKey: QUERY_KEYS.meals.all(spaceId || ''),
    queryFn: async () => {
      const [meals, stats] = await Promise.all([
        mealsService.getMeals(spaceId!),
        mealsService.getMealStats(spaceId!),
      ]);
      return { meals, stats };
    },
    enabled: !!spaceId && !!user && !gateLoading && hasAccess,
    ...QUERY_OPTIONS.features,
  });

  const meals = mealsData?.meals ?? [];
  const stats = mealsData?.stats ?? { thisWeek: 0, nextWeek: 0, savedRecipes: 0, shoppingItems: 0 };

  // React Query: fetch recipes
  const {
    data: recipes = [],
    refetch: refetchRecipes,
  } = useQuery({
    queryKey: QUERY_KEYS.meals.recipes(spaceId || ''),
    queryFn: () => mealsService.getRecipes(spaceId!),
    enabled: !!spaceId && !gateLoading && hasAccess,
    ...QUERY_OPTIONS.features,
  });

  const loading = mealsLoading;

  // Invalidation helpers
  const invalidateMeals = useCallback(() => {
    if (!spaceId) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meals.all(spaceId) });
  }, [spaceId, queryClient]);

  const invalidateRecipes = useCallback(() => {
    if (!spaceId) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meals.recipes(spaceId) });
  }, [spaceId, queryClient]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('week');
  const [pendingDeletions, setPendingDeletions] = useState<Map<string, { type: 'meal' | 'recipe', data: Meal | Recipe, timeoutId: NodeJS.Timeout }>>(new Map());
  // OPTIMIZATION: Use ref to avoid subscription recreation when pendingDeletions changes
  const pendingDeletionsRef = useRef(pendingDeletions);
  pendingDeletionsRef.current = pendingDeletions;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeModalInitialTab, setRecipeModalInitialTab] = useState<'manual' | 'ai' | 'discover'>('manual');
  const [showPastMeals, setShowPastMeals] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ingredient review modal state
  const [isIngredientReviewOpen, setIsIngredientReviewOpen] = useState(false);
  const [pendingMealData, setPendingMealData] = useState<CreateMealInput | null>(null);
  const [selectedRecipeForReview, setSelectedRecipeForReview] = useState<RecipeWithStringIngredients | null>(null);

  // Generate shopping list modal state
  const [isGenerateListOpen, setIsGenerateListOpen] = useState(false);

  // Memoized filtered meals based on search query and date (for list view)
  const filteredMeals = useMemo(() => {
    if (viewMode === 'recipes') return [];

    let filtered = meals;

    // List view: Filter out past meals unless showPastMeals is enabled
    if (viewMode === 'list' && !showPastMeals) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight local time
      filtered = filtered.filter(m => {
        const mealDate = new Date(m.scheduled_date);
        // Reset meal date to midnight for fair comparison
        mealDate.setHours(0, 0, 0, 0);
        return mealDate >= today;
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.recipe?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [meals, searchQuery, viewMode, showPastMeals]);

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
    filteredMeals.forEach(meal => {
      const dateKey = format(new Date(meal.scheduled_date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(meal);
    });
    return grouped;
  }, [filteredMeals]);

  // Optimized function to get meals for a specific date
  const getMealsForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return mealsByDate.get(dateKey) || [];
  }, [mealsByDate]);

  // Real-time subscriptions — invalidate React Query cache on changes
  useEffect(() => {
    if (!spaceId) return;

    const supabase = createClient();

    const mealsChannel = mealsService.subscribeToMeals(spaceId, () => {
      invalidateMeals();
    });

    const recipesChannel = mealsService.subscribeToRecipes(spaceId, () => {
      invalidateRecipes();
    });

    return () => {
      supabase.removeChannel(mealsChannel);
      supabase.removeChannel(recipesChannel);

      // Clear all pending deletion timeouts using ref
      pendingDeletionsRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    };
  }, [spaceId, invalidateMeals, invalidateRecipes]);

  // Memoized handlers
  const handleCreateMeal = useCallback(async (mealData: CreateMealInput, createShoppingList?: boolean) => {
    // If space is not available, don't allow meal creation
    if (!spaceId) {
      logger.warn('Cannot create meal: space not loaded yet', { component: 'page' });
      return;
    }

    try {
      // If creating shopping list and recipe has ingredients, show review modal
      // Check if this is a new meal (no editingMeal OR editingMeal has empty ID)
      const isNewMeal = !editingMeal || !editingMeal.id;

      if (createShoppingList && mealData.recipe_id && isNewMeal) {
        const recipe = recipes.find(r => r.id === mealData.recipe_id);
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
          // Convert ingredients to strings if they're objects
          const ingredientsAsStrings = recipe.ingredients.map((ingredient) => {
            if (typeof ingredient === 'string') return ingredient;
            if (ingredient && typeof ingredient === 'object') {
              const typedIngredient = ingredient as {
                name?: string;
                amount?: string | number;
                unit?: string;
              };
              const parts = [typedIngredient.amount, typedIngredient.unit, typedIngredient.name]
                .filter((part) => part !== undefined && part !== null && String(part).trim() !== '')
                .map((part) => String(part));
              if (parts.length > 0) return parts.join(' ');
            }
            return String(ingredient ?? '');
          });

          // Store the meal data and recipe with formatted ingredients
          setPendingMealData(mealData);
          setSelectedRecipeForReview({ ...recipe, ingredients: ingredientsAsStrings });
          setIsIngredientReviewOpen(true);
          return; // Don't create the meal yet
        }
      }

      // Otherwise, create/update meal directly (no shopping list or editing mode)
      // Check if editingMeal has an actual ID (editing) or empty ID (new meal with pre-selected recipe)
      if (editingMeal && editingMeal.id) {
        await mealsService.updateMeal(editingMeal.id, mealData);
      } else {
        await mealsService.createMeal(mealData);
      }

      invalidateMeals();
      setEditingMeal(null);
    } catch (error) {
      logger.error('Failed to save meal:', error, { component: 'page', action: 'execution' });
    }
  }, [editingMeal, invalidateMeals, spaceId, recipes]);

  const handleDeleteMeal = useCallback(async (mealId: string) => {
    const mealToDelete = meals.find(m => m.id === mealId);
    if (!mealToDelete) return;

    const mealsKey = QUERY_KEYS.meals.all(spaceId || '');

    // Optimistically remove from UI via query cache
    const previousData = queryClient.getQueryData<{ meals: Meal[]; stats: typeof stats }>(mealsKey);
    queryClient.setQueryData<{ meals: Meal[]; stats: typeof stats } | undefined>(
      mealsKey,
      (old) => old ? { ...old, meals: old.meals.filter(m => m.id !== mealId) } : old,
    );

    // Schedule actual deletion after 5 seconds
    const timeoutId = setTimeout(async () => {
      try {
        await mealsService.deleteMeal(mealId);
        setPendingDeletions(prev => {
          const newMap = new Map(prev);
          newMap.delete(mealId);
          return newMap;
        });
        invalidateMeals();
      } catch (error) {
        logger.error('Failed to delete meal:', error, { component: 'page', action: 'execution' });
        showError('Failed to delete meal');
        // Restore on failure
        if (previousData) queryClient.setQueryData(mealsKey, previousData);
      }
    }, 5000);

    // Store pending deletion
    setPendingDeletions(prev => new Map(prev).set(mealId, { type: 'meal', data: mealToDelete, timeoutId }));

    // Show toast with undo option
    toast('Meal deleted', {
      description: 'You have 5 seconds to undo this action.',
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timeoutId);
          setPendingDeletions(prev => {
            const newMap = new Map(prev);
            newMap.delete(mealId);
            return newMap;
          });
          // Restore the meal via query cache
          if (previousData) queryClient.setQueryData(mealsKey, previousData);
          showSuccess('Meal restored!');
        }
      }
    });
  }, [meals, spaceId, queryClient, stats, invalidateMeals]);

  const handleCreateRecipe = useCallback(async (recipeData: CreateRecipeInput) => {
    // If space is not available, don't allow recipe creation
    if (!spaceId) {
      logger.warn('Cannot create recipe: space not loaded yet', { component: 'page' });
      return;
    }

    try {
      if (editingRecipe) {
        await mealsService.updateRecipe(editingRecipe.id, recipeData);
      } else {
        await mealsService.createRecipe(recipeData);
      }
      invalidateRecipes();
      setEditingRecipe(null);
    } catch (error) {
      logger.error('Failed to save recipe:', error, { component: 'page', action: 'execution' });
    }
  }, [editingRecipe, invalidateRecipes, spaceId]);

  const handleDeleteRecipe = useCallback(async (recipeId: string) => {
    const recipeToDelete = recipes.find(r => r.id === recipeId);
    if (!recipeToDelete) return;

    const recipesKey = QUERY_KEYS.meals.recipes(spaceId || '');

    // Optimistically remove from UI via query cache
    const previousRecipes = queryClient.getQueryData<Recipe[]>(recipesKey);
    queryClient.setQueryData<Recipe[]>(
      recipesKey,
      (old) => (old || []).filter(r => r.id !== recipeId),
    );

    // Schedule actual deletion after 5 seconds
    const timeoutId = setTimeout(async () => {
      try {
        await mealsService.deleteRecipe(recipeId);
        setPendingDeletions(prev => {
          const newMap = new Map(prev);
          newMap.delete(recipeId);
          return newMap;
        });
        invalidateRecipes();
      } catch (error) {
        logger.error('Failed to delete recipe:', error, { component: 'page', action: 'execution' });
        showError('Failed to delete recipe');
        // Restore on failure
        if (previousRecipes) queryClient.setQueryData(recipesKey, previousRecipes);
      }
    }, 5000);

    // Store pending deletion
    setPendingDeletions(prev => new Map(prev).set(recipeId, { type: 'recipe', data: recipeToDelete, timeoutId }));

    // Show toast with undo option
    toast('Recipe deleted', {
      description: 'You have 5 seconds to undo this action.',
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timeoutId);
          setPendingDeletions(prev => {
            const newMap = new Map(prev);
            newMap.delete(recipeId);
            return newMap;
          });
          // Restore the recipe via query cache
          if (previousRecipes) queryClient.setQueryData(recipesKey, previousRecipes);
          showSuccess('Recipe restored!');
        }
      }
    });
  }, [recipes, spaceId, queryClient, invalidateRecipes]);

  // Search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Handle typing animation
    if (value.length > 0) {
      setIsSearchTyping(true);
      const timeoutId = setTimeout(() => setIsSearchTyping(false), 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setIsSearchTyping(false);
    }
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

  // Week navigation handlers
  const handleWeekChange = useCallback((newWeek: Date) => {
    setCurrentWeek(newWeek);
  }, []);

  const handleAddMealForDate = useCallback((date: Date, mealType?: string) => {
    if (!spaceId) return;

    // Format date as yyyy-MM-dd to avoid timezone issues
    const formattedDate = format(date, 'yyyy-MM-dd');

    // Pre-populate meal modal with selected date and meal type
    setEditingMeal({
      id: '',
      space_id: spaceId,
      recipe_id: undefined,
      recipe: undefined,
      name: '',
      meal_type: (mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack') || 'dinner',
      scheduled_date: formattedDate,
      notes: '',
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Meal);
    setIsModalOpen(true);
  }, [spaceId]);

  // Modal handlers
  const handleOpenMealModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseMealModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMeal(null);
  }, []);

  const handleOpenRecipeModal = useCallback(() => {
    setRecipeModalInitialTab('manual');
    setIsRecipeModalOpen(true);
  }, []);

  const handleCloseRecipeModal = useCallback(() => {
    setIsRecipeModalOpen(false);
    setEditingRecipe(null);
    setRecipeModalInitialTab('manual');
  }, []);

  const handleOpenRecipeDiscover = useCallback(() => {
    setRecipeModalInitialTab('discover');
    setIsRecipeModalOpen(true);
  }, []);

  const handleRecipeAddedFromDiscover = useCallback(async (recipeData: CreateRecipeInput) => {
    if (!spaceId) return;

    try {
      // Save the recipe to library
      const savedRecipe = await mealsService.createRecipe(recipeData);

      // Reload recipes to get the new one
      await refetchRecipes();

      // Close recipe modal
      setIsRecipeModalOpen(false);
      setRecipeModalInitialTab('manual');

      // Format date as yyyy-MM-dd to avoid timezone issues
      const formattedDate = format(new Date(), 'yyyy-MM-dd');

      // Pre-populate the meal modal with the newly added recipe
      setEditingMeal({
        id: '', // Empty ID indicates this is a new meal
        space_id: spaceId,
        recipe_id: savedRecipe.id,
        recipe: savedRecipe,
        name: '',
        meal_type: 'dinner',
        scheduled_date: formattedDate,
        notes: '',
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Meal);

      // Keep meal modal open (it should already be open)
      setIsModalOpen(true);

      showSuccess('Recipe added to library and selected for your meal!');
    } catch (error) {
      logger.error('Failed to save discovered recipe:', error, { component: 'page', action: 'execution' });
      showError('Failed to save recipe. Please try again.');
    }
  }, [spaceId, refetchRecipes]);

  // Stat card click handlers
  const handleThisWeekClick = useCallback(() => {
    setViewMode('calendar');
    setCalendarViewMode('week');
    setCurrentWeek(new Date());
  }, []);

  const handleNextTwoWeeksClick = useCallback(() => {
    setViewMode('calendar');
    setCalendarViewMode('2weeks');
    setCurrentWeek(new Date());
  }, []);

  const handleSavedRecipesClick = useCallback(() => {
    setViewMode('recipes');
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

  const handlePlanMealFromRecipe = useCallback((recipe: Recipe) => {
    if (!spaceId) return;

    // Format date as yyyy-MM-dd to avoid timezone issues
    const formattedDate = format(new Date(), 'yyyy-MM-dd');

    // Create a new meal state with pre-selected recipe
    setEditingMeal({
      id: '', // Empty ID indicates this is a new meal
      space_id: spaceId,
      recipe_id: recipe.id,
      recipe: recipe,
      name: '',
      meal_type: 'dinner',
      scheduled_date: formattedDate,
      notes: '',
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Meal);
    setIsModalOpen(true);
  }, [spaceId]);

  // Meal card handlers
  const handleEditMeal = useCallback((meal: Meal) => {
    setEditingMeal(meal);
    setIsModalOpen(true);
  }, []);

  // Handle ingredient selection confirmation from modal
  // Bulk operations handlers
  const handleBulkDelete = useCallback(async (mealIds: string[]) => {
    toast('Delete selected meals?', {
      description: `This will delete ${mealIds.length} meal${mealIds.length > 1 ? 's' : ''}. This action cannot be undone.`,
      action: {
        label: 'Delete All',
        onClick: async () => {
          try {
            await Promise.all(mealIds.map(id => mealsService.deleteMeal(id)));
            showSuccess(`${mealIds.length} meal${mealIds.length > 1 ? 's' : ''} deleted successfully!`);
            invalidateMeals();
          } catch (error) {
            logger.error('Failed to delete meals:', error, { component: 'page', action: 'execution' });
            showError('Failed to delete some meals. Please try again.');
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  }, [invalidateMeals]);

  const handleBulkGenerateList = useCallback(async (mealIds: string[]) => {
    const selectedMeals = meals.filter(m => mealIds.includes(m.id));
    const mealsWithRecipes = selectedMeals.filter(m => m.recipe && m.recipe.ingredients);

    if (mealsWithRecipes.length === 0) {
      showError('Selected meals must have recipes with ingredients.');
      return;
    }

    setIsGenerateListOpen(true);
  }, [meals]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      handler: handleOpenMealModal,
      description: 'Create new meal'
    },
    {
      key: 'r',
      handler: handleOpenRecipeModal,
      description: 'Create new recipe'
    },
    {
      key: '/',
      handler: () => searchInputRef.current?.focus(),
      description: 'Focus search'
    },
    {
      key: 'k',
      ctrl: true,
      handler: () => searchInputRef.current?.focus(),
      description: 'Focus search (Ctrl+K)'
    },
    {
      key: '1',
      handler: handleSetCalendarView,
      description: 'Switch to calendar view'
    },
    {
      key: '2',
      handler: handleSetListView,
      description: 'Switch to list view'
    },
    {
      key: '3',
      handler: handleSetRecipesView,
      description: 'Switch to recipes view'
    },
    {
      key: 'Escape',
      handler: () => {
        if (isModalOpen) handleCloseMealModal();
        if (isRecipeModalOpen) handleCloseRecipeModal();
        if (isGenerateListOpen) setIsGenerateListOpen(false);
        if (isIngredientReviewOpen) {
          setIsIngredientReviewOpen(false);
          setPendingMealData(null);
          setSelectedRecipeForReview(null);
        }
      },
      description: 'Close modals'
    }
  ]);

  // Pull-to-refresh handler
  const handlePullToRefresh = useCallback(async () => {
    await Promise.all([refetchMeals(), refetchRecipes()]);
  }, [refetchMeals, refetchRecipes]);

  const handleIngredientConfirm = useCallback(async (selectedIngredients: string[]) => {
    if (!pendingMealData || !selectedRecipeForReview || !spaceId) return;

    try {
      // Create the meal
      await mealsService.createMeal(pendingMealData);

      // Create shopping list with meal name and date
      const formattedDate = format(new Date(pendingMealData.scheduled_date), 'MM/dd/yyyy');
      const listTitle = `${pendingMealData.name || selectedRecipeForReview.name} - ${formattedDate}`;

      const list = await shoppingService.createList({
        space_id: spaceId,
        title: listTitle,
        description: `Ingredients for ${selectedRecipeForReview.name}`,
        status: 'active',
      });

      // Add only selected ingredients to shopping list
      await Promise.all(
        selectedIngredients.map((ingredient) =>
          shoppingService.createItem({
            list_id: list.id,
            name: ingredient,
            quantity: 1,
          })
        )
      );

      // Close modal and reload meals
      setIsIngredientReviewOpen(false);
      setPendingMealData(null);
      setSelectedRecipeForReview(null);
      invalidateMeals();

      // Show success notification with option to view
      showSuccess(`Shopping list "${listTitle}" created with ${selectedIngredients.length} ingredient${selectedIngredients.length > 1 ? 's' : ''}!`, {
        label: 'View Shopping Lists',
        onClick: () => window.location.href = '/shopping'
      });
    } catch (error) {
      logger.error('Failed to create meal with shopping list:', error, { component: 'page', action: 'execution' });
      showError('Failed to create shopping list. Please try again.');
    }
  }, [pendingMealData, selectedRecipeForReview, spaceId, invalidateMeals]);

  // Render feature gate wrapper (handles loading and blocked states)
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
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-meals flex items-center justify-center flex-shrink-0"><UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
              <div>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold bg-gradient-meals bg-clip-text text-transparent">Meal Planning</h1>
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
              className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 transition-all duration-200 cursor-pointer text-left"
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
              className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 transition-all duration-200 cursor-pointer text-left"
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
              className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 transition-all duration-200 cursor-pointer text-left"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                <div className="text-center py-12 max-w-lg mx-auto">
                  <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ChefHat className="w-12 h-12 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {searchQuery ? 'No recipes found' : 'Your recipe collection awaits'}
                  </h3>
                  <p className="text-gray-400 mb-2">
                    {searchQuery
                      ? `No recipes match "${searchQuery}". Try adjusting your search or browse all recipes.`
                      : 'Save your favorite recipes to quickly plan meals and generate shopping lists.'
                    }
                  </p>
                  {!searchQuery && (
                    <>
                      <p className="text-sm text-gray-500 mb-6">
                        💡 Tip: You can add recipes manually or import them from a URL!
                      </p>
                      <button
                        onClick={handleOpenRecipeModal}
                        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                      >
                        <ChefHat className="w-5 h-5" />
                        Create Your First Recipe
                      </button>
                    </>
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
              <div className="w-full">
                {/* Calendar View Mode Selector - Pill-shaped on Mobile */}
                <div className="flex items-center justify-center mb-3 sm:mb-6 px-2 sm:px-0">
                  <div className="flex items-center w-auto inline-flex gap-0.5 sm:gap-1 p-1 sm:p-1.5 bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-full sm:rounded-xl border border-orange-700">
                    <button
                      onClick={() => setCalendarViewMode('week')}
                      className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full sm:rounded-lg transition-all font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 ${
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
                      className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full sm:rounded-lg transition-all font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 ${
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
                      className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full sm:rounded-lg transition-all font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 ${
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
                    onGenerateList={() => setIsGenerateListOpen(true)}
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
                    onGenerateList={() => setIsGenerateListOpen(true)}
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
                <div className="text-center py-12 max-w-lg mx-auto">
                  <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UtensilsCrossed className="w-12 h-12 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {searchQuery ? 'No meals found' : 'Your meal planning journey begins'}
                  </h3>
                  <p className="text-gray-400 mb-2">
                    {searchQuery
                      ? `No meals match "${searchQuery}". Try adjusting your search or browse all meals.`
                      : 'Plan your meals ahead of time to save time, reduce stress, and eat healthier.'
                    }
                  </p>
                  {!searchQuery && (
                    <>
                      <p className="text-sm text-gray-500 mb-6">
                        💡 Tip: Link meals to recipes for automatic ingredient tracking and shopping list generation!
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <CTAButton
                          onClick={handleOpenMealModal}
                          feature="meals"
                          icon={<Plus className="w-5 h-5" />}
                          className="rounded-full"
                        >
                          Plan Your First Meal
                        </CTAButton>
                      </div>
                    </>
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
            setIsIngredientReviewOpen(false);
            setPendingMealData(null);
            setSelectedRecipeForReview(null);
          }}
          onConfirm={handleIngredientConfirm}
          ingredients={selectedRecipeForReview.ingredients}
          recipeName={selectedRecipeForReview.name}
        />
      )}
      {spaceId && (
        <GenerateListModal
          isOpen={isGenerateListOpen}
          onClose={() => setIsGenerateListOpen(false)}
          meals={meals}
          spaceId={spaceId}
          onSuccess={() => invalidateMeals()}
        />
      )}
      </PullToRefresh>
    </FeatureLayout>
    </FeatureGateWrapper>
  );
}
