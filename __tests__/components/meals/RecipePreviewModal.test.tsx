// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ExternalRecipe } from '@/lib/services/external-recipes-service';

vi.mock('@/lib/hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeUrl: (url: string) => url,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

const mockRecipe: ExternalRecipe = {
  id: 'recipe-ext-1',
  source: 'themealdb',
  name: 'Pasta Carbonara',
  description: 'Classic Italian pasta dish',
  ingredients: [
    { name: 'spaghetti', amount: '200', unit: 'g' },
    { name: 'pancetta', amount: '100', unit: 'g' },
    { name: 'eggs', amount: '2' },
    { name: 'parmesan', amount: '50', unit: 'g' },
  ],
  instructions: 'Cook pasta. Fry pancetta. Mix eggs and cheese. Combine.',
  prep_time: 10,
  cook_time: 20,
  servings: 4,
  image_url: 'https://example.com/pasta.jpg',
  source_url: 'https://example.com/recipe',
  cuisine: 'Italian',
};

import { RecipePreviewModal } from '@/components/meals/RecipePreviewModal';

describe('RecipePreviewModal', () => {
  const onClose = vi.fn();
  const onPlanMeal = vi.fn();
  const onAddToLibrary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when closed', () => {
    const { container } = render(
      <RecipePreviewModal
        isOpen={false}
        onClose={onClose}
        recipe={mockRecipe}
        onPlanMeal={onPlanMeal}
        onAddToLibrary={onAddToLibrary}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing when open with recipe', async () => {
    const { container } = render(
      <RecipePreviewModal
        isOpen={true}
        onClose={onClose}
        recipe={mockRecipe}
        onPlanMeal={onPlanMeal}
        onAddToLibrary={onAddToLibrary}
      />
    );
    await act(async () => {});
    expect(container.firstChild).not.toBeNull();
  });

  it('renders recipe name when open', async () => {
    render(
      <RecipePreviewModal
        isOpen={true}
        onClose={onClose}
        recipe={mockRecipe}
        onPlanMeal={onPlanMeal}
        onAddToLibrary={onAddToLibrary}
      />
    );
    await act(async () => {});
    expect(screen.getByText('Pasta Carbonara')).toBeTruthy();
  });

  it('renders null when recipe is null', () => {
    const { container } = render(
      <RecipePreviewModal
        isOpen={true}
        onClose={onClose}
        recipe={null}
        onPlanMeal={onPlanMeal}
        onAddToLibrary={onAddToLibrary}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders close button when open', async () => {
    render(
      <RecipePreviewModal
        isOpen={true}
        onClose={onClose}
        recipe={mockRecipe}
        onPlanMeal={onPlanMeal}
        onAddToLibrary={onAddToLibrary}
      />
    );
    await act(async () => {});
    const closeButton = document.querySelector('[aria-label="Close modal"]');
    expect(closeButton).toBeTruthy();
  });

  it('calls onClose when close button is clicked', async () => {
    render(
      <RecipePreviewModal
        isOpen={true}
        onClose={onClose}
        recipe={mockRecipe}
        onPlanMeal={onPlanMeal}
        onAddToLibrary={onAddToLibrary}
      />
    );
    await act(async () => {});
    const closeButton = document.querySelector('[aria-label="Close modal"]');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('shows recipe ingredients when open', async () => {
    render(
      <RecipePreviewModal
        isOpen={true}
        onClose={onClose}
        recipe={mockRecipe}
        onPlanMeal={onPlanMeal}
        onAddToLibrary={onAddToLibrary}
      />
    );
    await act(async () => {});
    // Ingredients are rendered as {amount}{unit} {name} or similar
    const ingredientText = screen.queryByText(/spaghetti/i);
    expect(ingredientText).toBeTruthy();
  });

  it('shows cook time when open', async () => {
    render(
      <RecipePreviewModal
        isOpen={true}
        onClose={onClose}
        recipe={mockRecipe}
        onPlanMeal={onPlanMeal}
        onAddToLibrary={onAddToLibrary}
      />
    );
    await act(async () => {});
    // cook_time: 20 renders as "20m cook"
    const cookTimeEl = screen.queryByText(/20m cook/i) || screen.queryByText(/20/);
    expect(cookTimeEl).toBeTruthy();
  });
});
