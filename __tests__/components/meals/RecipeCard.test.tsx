// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeCard } from '@/components/meals/RecipeCard';
import type { Recipe } from '@/lib/services/meals-service';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'recipe-1',
  space_id: 'space-1',
  name: 'Spaghetti Bolognese',
  description: 'Classic Italian pasta',
  ingredients: ['pasta', 'beef', 'tomato sauce'],
  instructions: 'Cook pasta. Brown beef. Combine.',
  prep_time: 15,
  cook_time: 30,
  servings: 4,
  image_url: null,
  tags: ['Italian', 'Pasta'],
  difficulty: 'medium',
  cuisine_type: 'Italian',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('RecipeCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <RecipeCard
        recipe={makeRecipe()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPlanMeal={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });

  it('displays the recipe name', () => {
    render(
      <RecipeCard
        recipe={makeRecipe({ name: 'Chicken Tikka' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPlanMeal={vi.fn()}
      />
    );
    expect(screen.getByText('Chicken Tikka')).toBeTruthy();
  });

  it('displays description', () => {
    render(
      <RecipeCard
        recipe={makeRecipe({ description: 'Spicy Indian dish' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPlanMeal={vi.fn()}
      />
    );
    expect(screen.getByText('Spicy Indian dish')).toBeTruthy();
  });

  it('displays total cook time', () => {
    render(
      <RecipeCard
        recipe={makeRecipe({ prep_time: 15, cook_time: 30 })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPlanMeal={vi.fn()}
      />
    );
    expect(screen.getByText('45 min')).toBeTruthy();
  });

  it('displays servings', () => {
    render(
      <RecipeCard
        recipe={makeRecipe({ servings: 6 })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPlanMeal={vi.fn()}
      />
    );
    expect(screen.getByText('6 servings')).toBeTruthy();
  });

  it('displays tags', () => {
    render(
      <RecipeCard
        recipe={makeRecipe({ tags: ['Italian', 'Pasta', 'Quick'] })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPlanMeal={vi.fn()}
      />
    );
    expect(screen.getByText('Italian')).toBeTruthy();
    expect(screen.getByText('Pasta')).toBeTruthy();
  });

  it('shows placeholder when no image', () => {
    const { container } = render(
      <RecipeCard
        recipe={makeRecipe({ image_url: null })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPlanMeal={vi.fn()}
      />
    );
    // Should have fallback gradient container, no img element
    expect(container.querySelector('img')).toBeNull();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    const recipe = makeRecipe();
    render(
      <RecipeCard recipe={recipe} onEdit={onEdit} onDelete={vi.fn()} onPlanMeal={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Edit recipe'));
    expect(onEdit).toHaveBeenCalledWith(recipe);
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(
      <RecipeCard recipe={makeRecipe()} onEdit={vi.fn()} onDelete={onDelete} onPlanMeal={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Delete recipe'));
    expect(onDelete).toHaveBeenCalledWith('recipe-1');
  });

  it('calls onPlanMeal when Plan button clicked', () => {
    const onPlanMeal = vi.fn();
    const recipe = makeRecipe();
    render(
      <RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} onPlanMeal={onPlanMeal} />
    );
    fireEvent.click(screen.getByText('Plan This Meal'));
    expect(onPlanMeal).toHaveBeenCalledWith(recipe);
  });
});
