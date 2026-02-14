'use client';

import { useCallback } from 'react';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { mealsService, Meal, Recipe, CreateMealInput, CreateRecipeInput } from '@/lib/services/meals-service';
import { shoppingService } from '@/lib/services/shopping-service';
import { format, addMonths, subMonths } from 'date-fns';
import { showSuccess, showError } from '@/lib/utils/toast';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { QUERY_KEYS } from '@/lib/react-query/query-client';
import type { QueryClient } from '@tanstack/react-query';
import type { ViewMode, CalendarViewMode, MealsStats, PendingDeletion } from '@/lib/hooks/useMealsData';
import type { RecipeWithStringIngredients } from '@/lib/hooks/useMealsModals';

// ─── Dependencies interface ───────────────────────────────────────────────────

export interface UseMealsHandlersDeps {
  // Auth
  spaceId: string | undefined;

  // Core data
  meals: Meal[];
  recipes: Recipe[];
  stats: MealsStats;

  // React Query
  queryClient: QueryClient;
  refetchMeals: () => Promise<unknown>;
  refetchRecipes: () => Promise<unknown>;
  invalidateMeals: () => void;
  invalidateRecipes: () => void;

  // Pending deletions
  setPendingDeletions: React.Dispatch<React.SetStateAction<Map<string, PendingDeletion>>>;

  // View / filter state setters
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  setCalendarViewMode: React.Dispatch<React.SetStateAction<CalendarViewMode>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  setCurrentWeek: React.Dispatch<React.SetStateAction<Date>>;

  // Search ref
  searchInputRef: React.RefObject<HTMLInputElement | null>;

  // Modal state (from useMealsModals)
  editingMeal: Meal | null;
  setEditingMeal: React.Dispatch<React.SetStateAction<Meal | null>>;
  editingRecipe: Recipe | null;
  setEditingRecipe: React.Dispatch<React.SetStateAction<Recipe | null>>;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRecipeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setRecipeModalInitialTab: React.Dispatch<React.SetStateAction<'manual' | 'ai' | 'discover'>>;
  isIngredientReviewOpen: boolean;
  setIsIngredientReviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pendingMealData: CreateMealInput | null;
  setPendingMealData: React.Dispatch<React.SetStateAction<CreateMealInput | null>>;
  selectedRecipeForReview: RecipeWithStringIngredients | null;
  setSelectedRecipeForReview: React.Dispatch<React.SetStateAction<RecipeWithStringIngredients | null>>;
  setIsGenerateListOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPastMeals: React.Dispatch<React.SetStateAction<boolean>>;

  // Modal open/close callbacks
  handleOpenMealModal: () => void;
  handleCloseMealModal: () => void;
  handleOpenRecipeModal: () => void;
  handleCloseRecipeModal: () => void;
  handleEscapeClose: () => void;
}

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseMealsHandlersReturn {
  // CRUD handlers
  handleCreateMeal: (mealData: CreateMealInput, createShoppingList?: boolean) => Promise<void>;
  handleDeleteMeal: (mealId: string) => Promise<void>;
  handleCreateRecipe: (recipeData: CreateRecipeInput) => Promise<void>;
  handleDeleteRecipe: (recipeId: string) => Promise<void>;

  // Search handler
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // View mode handlers
  handleSetCalendarView: () => void;
  handleSetListView: () => void;
  handleSetRecipesView: () => void;

  // Calendar navigation handlers
  handlePreviousMonth: () => void;
  handleNextMonth: () => void;
  handleWeekChange: (newWeek: Date) => void;
  handleAddMealForDate: (date: Date, mealType?: string) => void;

  // Stat card click handlers
  handleThisWeekClick: () => void;
  handleNextTwoWeeksClick: () => void;
  handleSavedRecipesClick: () => void;

  // Calendar day click handlers
  handleMealClick: (meal: Meal) => void;
  handleAddMealClick: () => void;

  // Recipe card handlers
  handleEditRecipe: (recipe: Recipe) => void;
  handlePlanMealFromRecipe: (recipe: Recipe) => void;

  // Meal card handlers
  handleEditMeal: (meal: Meal) => void;

  // Recipe discover handler
  handleRecipeAddedFromDiscover: (recipeData: CreateRecipeInput) => Promise<void>;

  // Ingredient confirmation handler
  handleIngredientConfirm: (selectedIngredients: string[]) => Promise<void>;

  // Bulk operations handlers
  handleBulkDelete: (mealIds: string[]) => Promise<void>;
  handleBulkGenerateList: (mealIds: string[]) => Promise<void>;

  // Pull-to-refresh handler
  handlePullToRefresh: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Provides CRUD handlers for meal plans, recipes, and meal scheduling */
export function useMealsHandlers(deps: UseMealsHandlersDeps): UseMealsHandlersReturn {
  const {
    spaceId,
    meals,
    recipes,
    stats: _stats,
    queryClient,
    refetchMeals,
    refetchRecipes,
    invalidateMeals,
    invalidateRecipes,
    setPendingDeletions,
    setViewMode,
    setCalendarViewMode,
    setSearchQuery,
    setIsSearchTyping,
    setCurrentMonth,
    setCurrentWeek,
    searchInputRef,
    editingMeal,
    setEditingMeal,
    editingRecipe,
    setEditingRecipe,
    setIsModalOpen,
    setIsRecipeModalOpen,
    setRecipeModalInitialTab,
    setPendingMealData,
    setSelectedRecipeForReview,
    setIsIngredientReviewOpen,
    setIsGenerateListOpen,
    pendingMealData,
    selectedRecipeForReview,
    handleOpenMealModal,
    handleOpenRecipeModal,
    handleEscapeClose,
  } = deps;

  // ─── CRUD handlers ─────────────────────────────────────────────────────────

  const handleCreateMeal = useCallback(async (mealData: CreateMealInput, createShoppingList?: boolean) => {
    if (!spaceId) {
      logger.warn('Cannot create meal: space not loaded yet', { component: 'page' });
      return;
    }

    try {
      const isNewMeal = !editingMeal || !editingMeal.id;

      if (createShoppingList && mealData.recipe_id && isNewMeal) {
        const recipe = recipes.find(r => r.id === mealData.recipe_id);
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
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

          setPendingMealData(mealData);
          setSelectedRecipeForReview({ ...recipe, ingredients: ingredientsAsStrings });
          setIsIngredientReviewOpen(true);
          return;
        }
      }

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
  }, [editingMeal, invalidateMeals, spaceId, recipes, setPendingMealData, setSelectedRecipeForReview, setIsIngredientReviewOpen, setEditingMeal]);

  const handleDeleteMeal = useCallback(async (mealId: string) => {
    const mealToDelete = meals.find(m => m.id === mealId);
    if (!mealToDelete) return;

    const mealsKey = QUERY_KEYS.meals.all(spaceId || '');

    const previousData = queryClient.getQueryData<{ meals: Meal[]; stats: MealsStats }>(mealsKey);
    queryClient.setQueryData<{ meals: Meal[]; stats: MealsStats } | undefined>(
      mealsKey,
      (old) => old ? { ...old, meals: old.meals.filter(m => m.id !== mealId) } : old,
    );

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
        if (previousData) queryClient.setQueryData(mealsKey, previousData);
      }
    }, 5000);

    setPendingDeletions(prev => new Map(prev).set(mealId, { type: 'meal', data: mealToDelete, timeoutId }));

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
          if (previousData) queryClient.setQueryData(mealsKey, previousData);
          showSuccess('Meal restored!');
        }
      }
    });
  }, [meals, spaceId, queryClient, invalidateMeals, setPendingDeletions]);

  const handleCreateRecipe = useCallback(async (recipeData: CreateRecipeInput) => {
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
  }, [editingRecipe, invalidateRecipes, spaceId, setEditingRecipe]);

  const handleDeleteRecipe = useCallback(async (recipeId: string) => {
    const recipeToDelete = recipes.find(r => r.id === recipeId);
    if (!recipeToDelete) return;

    const recipesKey = QUERY_KEYS.meals.recipes(spaceId || '');

    const previousRecipes = queryClient.getQueryData<Recipe[]>(recipesKey);
    queryClient.setQueryData<Recipe[]>(
      recipesKey,
      (old) => (old || []).filter(r => r.id !== recipeId),
    );

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
        if (previousRecipes) queryClient.setQueryData(recipesKey, previousRecipes);
      }
    }, 5000);

    setPendingDeletions(prev => new Map(prev).set(recipeId, { type: 'recipe', data: recipeToDelete, timeoutId }));

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
          if (previousRecipes) queryClient.setQueryData(recipesKey, previousRecipes);
          showSuccess('Recipe restored!');
        }
      }
    });
  }, [recipes, spaceId, queryClient, invalidateRecipes, setPendingDeletions]);

  // ─── Search handler ─────────────────────────────────────────────────────────

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 0) {
      setIsSearchTyping(true);
      const timeoutId = setTimeout(() => setIsSearchTyping(false), 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setIsSearchTyping(false);
    }
  }, [setSearchQuery, setIsSearchTyping]);

  // ─── View mode handlers ─────────────────────────────────────────────────────

  const handleSetCalendarView = useCallback(() => setViewMode('calendar'), [setViewMode]);
  const handleSetListView = useCallback(() => setViewMode('list'), [setViewMode]);
  const handleSetRecipesView = useCallback(() => setViewMode('recipes'), [setViewMode]);

  // ─── Calendar navigation handlers ──────────────────────────────────────────

  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, [setCurrentMonth]);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, [setCurrentMonth]);

  const handleWeekChange = useCallback((newWeek: Date) => {
    setCurrentWeek(newWeek);
  }, [setCurrentWeek]);

  const handleAddMealForDate = useCallback((date: Date, mealType?: string) => {
    if (!spaceId) return;

    const formattedDate = format(date, 'yyyy-MM-dd');

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
  }, [spaceId, setEditingMeal, setIsModalOpen]);

  // ─── Stat card click handlers ──────────────────────────────────────────────

  const handleThisWeekClick = useCallback(() => {
    setViewMode('calendar');
    setCalendarViewMode('week');
    setCurrentWeek(new Date());
  }, [setViewMode, setCalendarViewMode, setCurrentWeek]);

  const handleNextTwoWeeksClick = useCallback(() => {
    setViewMode('calendar');
    setCalendarViewMode('2weeks');
    setCurrentWeek(new Date());
  }, [setViewMode, setCalendarViewMode, setCurrentWeek]);

  const handleSavedRecipesClick = useCallback(() => {
    setViewMode('recipes');
  }, [setViewMode]);

  // ─── Calendar day click handlers ───────────────────────────────────────────

  const handleMealClick = useCallback((meal: Meal) => {
    setEditingMeal(meal);
    setIsModalOpen(true);
  }, [setEditingMeal, setIsModalOpen]);

  const handleAddMealClick = useCallback(() => {
    setIsModalOpen(true);
  }, [setIsModalOpen]);

  // ─── Recipe card handlers ──────────────────────────────────────────────────

  const handleEditRecipe = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsRecipeModalOpen(true);
  }, [setEditingRecipe, setIsRecipeModalOpen]);

  const handlePlanMealFromRecipe = useCallback((recipe: Recipe) => {
    if (!spaceId) return;

    const formattedDate = format(new Date(), 'yyyy-MM-dd');

    setEditingMeal({
      id: '',
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
  }, [spaceId, setEditingMeal, setIsModalOpen]);

  // ─── Meal card handlers ────────────────────────────────────────────────────

  const handleEditMeal = useCallback((meal: Meal) => {
    setEditingMeal(meal);
    setIsModalOpen(true);
  }, [setEditingMeal, setIsModalOpen]);

  // ─── Recipe discover handler ───────────────────────────────────────────────

  const handleRecipeAddedFromDiscover = useCallback(async (recipeData: CreateRecipeInput) => {
    if (!spaceId) return;

    try {
      const savedRecipe = await mealsService.createRecipe(recipeData);
      await refetchRecipes();

      setIsRecipeModalOpen(false);
      setRecipeModalInitialTab('manual');

      const formattedDate = format(new Date(), 'yyyy-MM-dd');

      setEditingMeal({
        id: '',
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

      setIsModalOpen(true);

      showSuccess('Recipe added to library and selected for your meal!');
    } catch (error) {
      logger.error('Failed to save discovered recipe:', error, { component: 'page', action: 'execution' });
      showError('Failed to save recipe. Please try again.');
    }
  }, [spaceId, refetchRecipes, setIsRecipeModalOpen, setRecipeModalInitialTab, setEditingMeal, setIsModalOpen]);

  // ─── Ingredient confirmation handler ───────────────────────────────────────

  const handleIngredientConfirm = useCallback(async (selectedIngredients: string[]) => {
    if (!pendingMealData || !selectedRecipeForReview || !spaceId) return;

    try {
      await mealsService.createMeal(pendingMealData);

      const formattedDate = format(new Date(pendingMealData.scheduled_date), 'MM/dd/yyyy');
      const listTitle = `${pendingMealData.name || selectedRecipeForReview.name} - ${formattedDate}`;

      const list = await shoppingService.createList({
        space_id: spaceId,
        title: listTitle,
        description: `Ingredients for ${selectedRecipeForReview.name}`,
        status: 'active',
      });

      await Promise.all(
        selectedIngredients.map((ingredient) =>
          shoppingService.createItem({
            list_id: list.id,
            name: ingredient,
            quantity: 1,
          })
        )
      );

      setIsIngredientReviewOpen(false);
      setPendingMealData(null);
      setSelectedRecipeForReview(null);
      invalidateMeals();

      showSuccess(`Shopping list "${listTitle}" created with ${selectedIngredients.length} ingredient${selectedIngredients.length > 1 ? 's' : ''}!`, {
        label: 'View Shopping Lists',
        onClick: () => window.location.href = '/shopping'
      });
    } catch (error) {
      logger.error('Failed to create meal with shopping list:', error, { component: 'page', action: 'execution' });
      showError('Failed to create shopping list. Please try again.');
    }
  }, [pendingMealData, selectedRecipeForReview, spaceId, invalidateMeals, setIsIngredientReviewOpen, setPendingMealData, setSelectedRecipeForReview]);

  // ─── Bulk operations handlers ──────────────────────────────────────────────

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
  }, [meals, setIsGenerateListOpen]);

  // ─── Pull-to-refresh handler ───────────────────────────────────────────────

  const handlePullToRefresh = useCallback(async () => {
    await Promise.all([refetchMeals(), refetchRecipes()]);
  }, [refetchMeals, refetchRecipes]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────

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
      handler: handleEscapeClose,
      description: 'Close modals'
    }
  ]);

  return {
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
  };
}
