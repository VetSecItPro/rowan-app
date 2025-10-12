'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { UtensilsCrossed, Search, Plus, Calendar as CalendarIcon, BookOpen, TrendingUp, ShoppingBag, ChevronLeft, ChevronRight, LayoutGrid, List, ChefHat, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { MealCard } from '@/components/meals/MealCard';
import { NewMealModal } from '@/components/meals/NewMealModal';
import { NewRecipeModal } from '@/components/meals/NewRecipeModal';
import { RecipeCard } from '@/components/meals/RecipeCard';
import { IngredientReviewModal } from '@/components/meals/IngredientReviewModal';
import { GenerateListModal } from '@/components/meals/GenerateListModal';
import { WeekCalendarView } from '@/components/meals/WeekCalendarView';
import { TwoWeekCalendarView } from '@/components/meals/TwoWeekCalendarView';
import GuidedMealCreation from '@/components/guided/GuidedMealCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { mealsService, Meal, CreateMealInput, Recipe, CreateRecipeInput } from '@/lib/services/meals-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';
import { shoppingService } from '@/lib/services/shopping-service';
import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { showSuccess, showError, showPromise } from '@/lib/utils/toast';
import { toast } from 'sonner';

type ViewMode = 'calendar' | 'list' | 'recipes';
type CalendarViewMode = 'week' | '2weeks' | 'month';

// Memoized meal card component with meal planning orange color
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
          return (
            <button
              key={meal.id}
              onClick={() => onMealClick(meal)}
              className="w-full text-left px-2 py-1 rounded text-xs bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-500 hover:opacity-80 transition-opacity"
            >
              <p className="font-medium text-orange-700 dark:text-orange-300 truncate">
                {meal.recipe?.name || meal.name || 'Untitled'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] capitalize">
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
  const [stats, setStats] = useState({ thisWeek: 0, nextWeek: 0, savedRecipes: 0, shoppingItems: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('week');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);

  // Ingredient review modal state
  const [isIngredientReviewOpen, setIsIngredientReviewOpen] = useState(false);
  const [pendingMealData, setPendingMealData] = useState<CreateMealInput | null>(null);
  const [selectedRecipeForReview, setSelectedRecipeForReview] = useState<Recipe | null>(null);

  // Generate shopping list modal state
  const [isGenerateListOpen, setIsGenerateListOpen] = useState(false);

  // Memoized user color mapping
  const getUserColor = useCallback((userId: string) => {
    const userColors: Record<string, { border: string; bg: string; text: string }> = {
      'user-1': { border: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
      'user-2': { border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    };
    return userColors[userId] || userColors['user-1'];
  }, []);

  // Memoized filtered meals based on search query and date (for list view)
  const filteredMeals = useMemo(() => {
    if (viewMode === 'recipes') return [];

    let filtered = meals;

    // List view: Filter out past meals (scheduled_date < today at midnight)
    if (viewMode === 'list') {
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

  // Real-time subscriptions for collaborative editing
  useEffect(() => {
    if (!currentSpace) return;

    const supabase = createClient();

    // Subscribe to meal changes
    const mealsChannel = mealsService.subscribeToMeals(currentSpace.id, (payload) => {
      console.log('[Real-time] Meal change:', payload.eventType, payload.new || payload.old);

      if (payload.eventType === 'INSERT' && payload.new) {
        // Add new meal to state
        setMeals(prev => {
          // Check if meal already exists (avoid duplicates from optimistic updates)
          if (prev.find(m => m.id === payload.new!.id)) return prev;
          return [...prev, payload.new!];
        });
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        // Update existing meal in state
        setMeals(prev => prev.map(m => m.id === payload.new!.id ? payload.new! : m));
      } else if (payload.eventType === 'DELETE' && payload.old) {
        // Remove meal from state
        setMeals(prev => prev.filter(m => m.id !== payload.old!.id));
      }
    });

    // Subscribe to recipe changes
    const recipesChannel = mealsService.subscribeToRecipes(currentSpace.id, (payload) => {
      console.log('[Real-time] Recipe change:', payload.eventType, payload.new || payload.old);

      if (payload.eventType === 'INSERT' && payload.new) {
        setRecipes(prev => {
          if (prev.find(r => r.id === payload.new!.id)) return prev;
          return [...prev, payload.new!];
        });
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        setRecipes(prev => prev.map(r => r.id === payload.new!.id ? payload.new! : r));
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setRecipes(prev => prev.filter(r => r.id !== payload.old!.id));
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('[Real-time] Unsubscribing from channels');
      supabase.removeChannel(mealsChannel);
      supabase.removeChannel(recipesChannel);
    };
  }, [currentSpace]);

  // Memoized handlers
  const handleCreateMeal = useCallback(async (mealData: CreateMealInput, createShoppingList?: boolean) => {
    try {
      // If creating shopping list and recipe has ingredients, show review modal
      // Check if this is a new meal (no editingMeal OR editingMeal has empty ID)
      const isNewMeal = !editingMeal || !editingMeal.id;

      if (createShoppingList && mealData.recipe_id && currentSpace && isNewMeal) {
        const recipe = recipes.find(r => r.id === mealData.recipe_id);
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
          // Convert ingredients to strings if they're objects
          const ingredientsAsStrings = recipe.ingredients.map((ing: any) => {
            if (typeof ing === 'string') return ing;
            if (typeof ing === 'object' && ing.name) {
              // Format: "amount unit name" or just "name" if no amount/unit
              const parts = [];
              if (ing.amount) parts.push(ing.amount);
              if (ing.unit) parts.push(ing.unit);
              parts.push(ing.name);
              return parts.join(' ');
            }
            return JSON.stringify(ing); // Fallback
          });

          // Store the meal data and recipe with formatted ingredients
          setPendingMealData(mealData);
          setSelectedRecipeForReview({ ...recipe, ingredients: ingredientsAsStrings as any });
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

      loadMeals();
      setEditingMeal(null);
    } catch (error) {
      console.error('Failed to save meal:', error);
    }
  }, [editingMeal, loadMeals, currentSpace, recipes]);

  const handleDeleteMeal = useCallback(async (mealId: string) => {
    // Show confirmation toast with action button
    toast('Delete this meal?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await showPromise(
              mealsService.deleteMeal(mealId),
              {
                loading: 'Deleting meal...',
                success: 'Meal deleted successfully!',
                error: 'Failed to delete meal'
              }
            );
            loadMeals();
          } catch (error) {
            console.error('Failed to delete meal:', error);
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
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
    toast('Delete this recipe?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await showPromise(
              mealsService.deleteRecipe(recipeId),
              {
                loading: 'Deleting recipe...',
                success: 'Recipe deleted successfully!',
                error: 'Failed to delete recipe'
              }
            );
            loadRecipes();
          } catch (error) {
            console.error('Failed to delete recipe:', error);
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
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

  // Week navigation handlers
  const handleWeekChange = useCallback((newWeek: Date) => {
    setCurrentWeek(newWeek);
  }, []);

  const handleAddMealForDate = useCallback((date: Date, mealType?: string) => {
    // Pre-populate meal modal with selected date and meal type
    setEditingMeal({
      id: '',
      space_id: currentSpace?.id || '',
      recipe_id: null,
      recipe: null,
      name: '',
      meal_type: (mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack') || 'dinner',
      scheduled_date: date.toISOString(),
      notes: '',
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Meal);
    setIsModalOpen(true);
  }, [currentSpace]);

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

  const handlePlanMealFromRecipe = useCallback((recipe: Recipe) => {
    // Create a new meal state with pre-selected recipe
    setEditingMeal({
      id: '', // Empty ID indicates this is a new meal
      space_id: currentSpace?.id || '',
      recipe_id: recipe.id,
      recipe: recipe,
      name: '',
      meal_type: 'dinner',
      scheduled_date: new Date().toISOString(),
      notes: '',
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Meal);
    setIsModalOpen(true);
  }, [currentSpace]);

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

  // Handle ingredient selection confirmation from modal
  const handleIngredientConfirm = useCallback(async (selectedIngredients: string[]) => {
    if (!pendingMealData || !selectedRecipeForReview || !currentSpace) return;

    try {
      // Create the meal
      await mealsService.createMeal(pendingMealData);

      // Create shopping list with meal name and date
      const formattedDate = format(new Date(pendingMealData.scheduled_date), 'MM/dd/yyyy');
      const listTitle = `${pendingMealData.name || selectedRecipeForReview.name} - ${formattedDate}`;

      const list = await shoppingService.createList({
        space_id: currentSpace.id,
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
      loadMeals();

      // Show success notification with option to view
      showSuccess(`Shopping list "${listTitle}" created with ${selectedIngredients.length} ingredient${selectedIngredients.length > 1 ? 's' : ''}!`, {
        label: 'View Shopping Lists',
        onClick: () => window.location.href = '/shopping'
      });
    } catch (error) {
      console.error('Failed to create meal with shopping list:', error);
      showError('Failed to create shopping list. Please try again.');
    }
  }, [pendingMealData, selectedRecipeForReview, currentSpace, loadMeals]);

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

              {/* Shopping Actions Toggle */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700 w-full sm:w-auto">
                <Link
                  href="/shopping"
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50"
                  title="View your shopping lists"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-sm">View Lists</span>
                </Link>
                <button
                  onClick={() => setIsGenerateListOpen(true)}
                  disabled={meals.length === 0}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[120px] text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={meals.length === 0 ? 'Plan some meals first' : 'Select multiple meals to combine all recipe ingredients into one shopping list'}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Generate</span>
                </button>
              </div>

              {/* Meal Actions Toggle */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl border border-orange-200 dark:border-orange-700 w-full sm:w-auto">
                <button
                  onClick={handleOpenRecipeModal}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50"
                >
                  <ChefHat className="w-4 h-4" />
                  <span className="text-sm">Recipe</span>
                </button>
                <button
                  onClick={handleOpenMealModal}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] bg-gradient-to-r from-orange-600 to-red-600 text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Meal</span>
                </button>
              </div>
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
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Next Week</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.nextWeek}</p>
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
                {/* Calendar View Mode Selector */}
                <div className="flex items-center justify-center mb-6">
                  <div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl border border-orange-200 dark:border-orange-700">
                    <button
                      onClick={() => setCalendarViewMode('week')}
                      className={`px-3 sm:px-4 py-2 rounded-lg transition-all font-medium text-sm min-w-[70px] sm:min-w-[80px] ${
                        calendarViewMode === 'week'
                          ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setCalendarViewMode('2weeks')}
                      className={`px-3 sm:px-4 py-2 rounded-lg transition-all font-medium text-sm min-w-[70px] sm:min-w-[90px] ${
                        calendarViewMode === '2weeks'
                          ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      2 Weeks
                    </button>
                    <button
                      onClick={() => setCalendarViewMode('month')}
                      className={`px-3 sm:px-4 py-2 rounded-lg transition-all font-medium text-sm min-w-[70px] sm:min-w-[80px] ${
                        calendarViewMode === 'month'
                          ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
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
                    meals={meals}
                    onWeekChange={handleWeekChange}
                    onMealClick={handleMealClick}
                    onAddMeal={handleAddMealForDate}
                  />
                ) : calendarViewMode === '2weeks' ? (
                  /* Two Week Calendar View */
                  <TwoWeekCalendarView
                    currentWeek={currentWeek}
                    meals={meals}
                    onWeekChange={handleWeekChange}
                    onMealClick={handleMealClick}
                    onAddMeal={handleAddMealForDate}
                  />
                ) : (
                  /* Month Calendar View */
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
                )}
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
          <NewMealModal isOpen={isModalOpen} onClose={handleCloseMealModal} onSave={handleCreateMeal} editMeal={editingMeal} spaceId={currentSpace.id} recipes={recipes} />
          <NewRecipeModal isOpen={isRecipeModalOpen} onClose={handleCloseRecipeModal} onSave={handleCreateRecipe} editRecipe={editingRecipe} spaceId={currentSpace.id} />
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
          <GenerateListModal
            isOpen={isGenerateListOpen}
            onClose={() => setIsGenerateListOpen(false)}
            meals={meals}
            spaceId={currentSpace.id}
            onSuccess={() => loadMeals()}
          />
        </>
      )}
    </FeatureLayout>
  );
}
