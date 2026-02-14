'use client';

import { useState, useCallback } from 'react';
import type { Meal, Recipe, CreateMealInput } from '@/lib/services/meals-service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecipeWithStringIngredients = Omit<Recipe, 'ingredients'> & { ingredients: string[] };

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseMealsModalsReturn {
  // Meal modal
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingMeal: Meal | null;
  setEditingMeal: React.Dispatch<React.SetStateAction<Meal | null>>;
  handleOpenMealModal: () => void;
  handleCloseMealModal: () => void;

  // Recipe modal
  isRecipeModalOpen: boolean;
  setIsRecipeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingRecipe: Recipe | null;
  setEditingRecipe: React.Dispatch<React.SetStateAction<Recipe | null>>;
  recipeModalInitialTab: 'manual' | 'ai' | 'discover';
  setRecipeModalInitialTab: React.Dispatch<React.SetStateAction<'manual' | 'ai' | 'discover'>>;
  handleOpenRecipeModal: () => void;
  handleCloseRecipeModal: () => void;
  handleOpenRecipeDiscover: () => void;

  // Ingredient review modal
  isIngredientReviewOpen: boolean;
  setIsIngredientReviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pendingMealData: CreateMealInput | null;
  setPendingMealData: React.Dispatch<React.SetStateAction<CreateMealInput | null>>;
  selectedRecipeForReview: RecipeWithStringIngredients | null;
  setSelectedRecipeForReview: React.Dispatch<React.SetStateAction<RecipeWithStringIngredients | null>>;

  // Generate shopping list modal
  isGenerateListOpen: boolean;
  setIsGenerateListOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Show past meals toggle
  showPastMeals: boolean;
  setShowPastMeals: React.Dispatch<React.SetStateAction<boolean>>;

  // Escape key handler helper
  handleEscapeClose: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Manages open/close state for meal creation, editing, and recipe detail modals */
export function useMealsModals(): UseMealsModalsReturn {
  // Meal modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // Recipe modal state
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeModalInitialTab, setRecipeModalInitialTab] = useState<'manual' | 'ai' | 'discover'>('manual');

  // Ingredient review modal state
  const [isIngredientReviewOpen, setIsIngredientReviewOpen] = useState(false);
  const [pendingMealData, setPendingMealData] = useState<CreateMealInput | null>(null);
  const [selectedRecipeForReview, setSelectedRecipeForReview] = useState<RecipeWithStringIngredients | null>(null);

  // Generate shopping list modal state
  const [isGenerateListOpen, setIsGenerateListOpen] = useState(false);

  // Show past meals toggle
  const [showPastMeals, setShowPastMeals] = useState(false);

  // ─── Modal handlers ─────────────────────────────────────────────────────────

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

  // Escape key handler: close whichever modal is open
  const handleEscapeClose = useCallback(() => {
    if (isModalOpen) {
      setIsModalOpen(false);
      setEditingMeal(null);
    }
    if (isRecipeModalOpen) {
      setIsRecipeModalOpen(false);
      setEditingRecipe(null);
      setRecipeModalInitialTab('manual');
    }
    if (isGenerateListOpen) setIsGenerateListOpen(false);
    if (isIngredientReviewOpen) {
      setIsIngredientReviewOpen(false);
      setPendingMealData(null);
      setSelectedRecipeForReview(null);
    }
  }, [isModalOpen, isRecipeModalOpen, isGenerateListOpen, isIngredientReviewOpen]);

  return {
    // Meal modal
    isModalOpen,
    setIsModalOpen,
    editingMeal,
    setEditingMeal,
    handleOpenMealModal,
    handleCloseMealModal,

    // Recipe modal
    isRecipeModalOpen,
    setIsRecipeModalOpen,
    editingRecipe,
    setEditingRecipe,
    recipeModalInitialTab,
    setRecipeModalInitialTab,
    handleOpenRecipeModal,
    handleCloseRecipeModal,
    handleOpenRecipeDiscover,

    // Ingredient review modal
    isIngredientReviewOpen,
    setIsIngredientReviewOpen,
    pendingMealData,
    setPendingMealData,
    selectedRecipeForReview,
    setSelectedRecipeForReview,

    // Generate shopping list modal
    isGenerateListOpen,
    setIsGenerateListOpen,

    // Show past meals toggle
    showPastMeals,
    setShowPastMeals,

    // Escape helper
    handleEscapeClose,
  };
}
