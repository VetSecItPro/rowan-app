// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

// Mock next/dynamic to return a simple stub component
vi.mock('next/dynamic', () => ({
  default: (_loader: unknown, _opts?: unknown) => {
    const MockComponent = ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="dynamic-component">{children}</div>
    );
    MockComponent.displayName = 'DynamicComponent';
    return MockComponent;
  },
}));

vi.mock('./ProgressiveLoader', () => ({
  EnhancedModalSkeleton: ({ title }: { title: string }) => <div>Loading {title}</div>,
  ProgressiveCalendarSkeleton: ({ type }: { type: string }) => <div>Loading {type}</div>,
}));

vi.mock('@/components/ui/ProgressiveLoader', () => ({
  EnhancedModalSkeleton: ({ title }: { title: string }) => <div>Loading {title}</div>,
  ProgressiveCalendarSkeleton: ({ type }: { type: string }) => <div>Loading {type}</div>,
}));

import {
  DynamicMealComponents,
  NewMealModal,
  NewRecipeModal,
  IngredientReviewModal,
  RecipePreviewModal,
  GenerateListModal,
  QuickPlanModal,
  WeekCalendarView,
  TwoWeekCalendarView,
  MealCard,
  RecipeCard,
} from '@/components/ui/DynamicMealComponents';

describe('DynamicMealComponents', () => {
  it('exports DynamicMealComponents object', () => {
    expect(DynamicMealComponents).toBeDefined();
  });

  it('has all expected keys', () => {
    expect(DynamicMealComponents.NewMealModal).toBeDefined();
    expect(DynamicMealComponents.NewRecipeModal).toBeDefined();
    expect(DynamicMealComponents.IngredientReviewModal).toBeDefined();
    expect(DynamicMealComponents.RecipePreviewModal).toBeDefined();
    expect(DynamicMealComponents.GenerateListModal).toBeDefined();
    expect(DynamicMealComponents.QuickPlanModal).toBeDefined();
    expect(DynamicMealComponents.WeekCalendarView).toBeDefined();
    expect(DynamicMealComponents.TwoWeekCalendarView).toBeDefined();
    expect(DynamicMealComponents.MealCard).toBeDefined();
    expect(DynamicMealComponents.RecipeCard).toBeDefined();
  });

  it('exports named dynamic components', () => {
    expect(NewMealModal).toBeDefined();
    expect(NewRecipeModal).toBeDefined();
    expect(IngredientReviewModal).toBeDefined();
    expect(RecipePreviewModal).toBeDefined();
    expect(GenerateListModal).toBeDefined();
    expect(QuickPlanModal).toBeDefined();
    expect(WeekCalendarView).toBeDefined();
    expect(TwoWeekCalendarView).toBeDefined();
    expect(MealCard).toBeDefined();
    expect(RecipeCard).toBeDefined();
  });
});
