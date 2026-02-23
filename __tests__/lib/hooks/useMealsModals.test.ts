/**
 * Unit tests for lib/hooks/useMealsModals.ts
 *
 * Tests meal, recipe, ingredient-review, and generate-list modal state management.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMealsModals } from '@/lib/hooks/useMealsModals';

describe('useMealsModals', () => {
  it('should initialize all modals as closed', () => {
    const { result } = renderHook(() => useMealsModals());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingMeal).toBeNull();
    expect(result.current.isRecipeModalOpen).toBe(false);
    expect(result.current.editingRecipe).toBeNull();
    expect(result.current.recipeModalInitialTab).toBe('manual');
    expect(result.current.isIngredientReviewOpen).toBe(false);
    expect(result.current.pendingMealData).toBeNull();
    expect(result.current.selectedRecipeForReview).toBeNull();
    expect(result.current.isGenerateListOpen).toBe(false);
    expect(result.current.showPastMeals).toBe(false);
  });

  it('handleOpenMealModal should open meal modal', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.handleOpenMealModal());

    expect(result.current.isModalOpen).toBe(true);
  });

  it('handleCloseMealModal should close modal and clear editing meal', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.handleOpenMealModal());
    act(() => result.current.handleCloseMealModal());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingMeal).toBeNull();
  });

  it('handleOpenRecipeModal should open recipe modal with manual tab', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.handleOpenRecipeModal());

    expect(result.current.isRecipeModalOpen).toBe(true);
    expect(result.current.recipeModalInitialTab).toBe('manual');
  });

  it('handleOpenRecipeDiscover should open recipe modal with discover tab', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.handleOpenRecipeDiscover());

    expect(result.current.isRecipeModalOpen).toBe(true);
    expect(result.current.recipeModalInitialTab).toBe('discover');
  });

  it('handleCloseRecipeModal should close and reset recipe modal state', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.handleOpenRecipeDiscover());
    act(() => result.current.handleCloseRecipeModal());

    expect(result.current.isRecipeModalOpen).toBe(false);
    expect(result.current.editingRecipe).toBeNull();
    expect(result.current.recipeModalInitialTab).toBe('manual');
  });

  it('handleEscapeClose should close open meal modal', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.handleOpenMealModal());
    act(() => result.current.handleEscapeClose());

    expect(result.current.isModalOpen).toBe(false);
  });

  it('handleEscapeClose should close open recipe modal', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.handleOpenRecipeModal());
    act(() => result.current.handleEscapeClose());

    expect(result.current.isRecipeModalOpen).toBe(false);
  });

  it('handleEscapeClose should close generate list modal', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.setIsGenerateListOpen(true));
    act(() => result.current.handleEscapeClose());

    expect(result.current.isGenerateListOpen).toBe(false);
  });

  it('handleEscapeClose should close ingredient review modal and clear pending data', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => {
      result.current.setIsIngredientReviewOpen(true);
      result.current.setPendingMealData({ title: 'Test Meal' } as Parameters<typeof result.current.setPendingMealData>[0]);
    });
    act(() => result.current.handleEscapeClose());

    expect(result.current.isIngredientReviewOpen).toBe(false);
    expect(result.current.pendingMealData).toBeNull();
    expect(result.current.selectedRecipeForReview).toBeNull();
  });

  it('setShowPastMeals should toggle past meals visibility', () => {
    const { result } = renderHook(() => useMealsModals());

    act(() => result.current.setShowPastMeals(true));

    expect(result.current.showPastMeals).toBe(true);
  });
});
