// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewRecipeModal } from '@/components/meals/NewRecipeModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/utils/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
}));
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ recipe: {} }) }),
}));
vi.mock('@/lib/services/external-recipes-service', () => ({
  searchExternalRecipes: vi.fn().mockResolvedValue([]),
  searchByCuisine: vi.fn().mockResolvedValue([]),
  getRandomRecipes: vi.fn().mockResolvedValue([]),
  SUPPORTED_CUISINES: [{ value: 'italian', label: 'Italian', flag: '🇮🇹' }],
}));
vi.mock('@/components/meals/RecipePreviewModal', () => ({
  RecipePreviewModal: () => null,
}));
vi.mock('@/components/shared/ImageUpload', () => ({
  default: () => React.createElement('div', { 'data-testid': 'image-upload' }),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

describe('NewRecipeModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    spaceId: 'space-1',
  };

  it('renders without crashing when closed', () => {
    const { container } = render(<NewRecipeModal {...defaultProps} isOpen={false} />);
    expect(container).toBeTruthy();
  });

  it('renders Create New Recipe title', () => {
    render(<NewRecipeModal {...defaultProps} />);
    expect(screen.getByText('Create New Recipe')).toBeTruthy();
  });

  it('shows Edit Recipe title when editing', () => {
    const editRecipe = {
      id: 'r-1',
      space_id: 'space-1',
      name: 'Old Recipe',
      description: '',
      ingredients: [],
      instructions: '',
      prep_time: undefined,
      cook_time: undefined,
      servings: undefined,
      image_url: null,
      tags: [],
      created_at: '2026-01-01T00:00:00Z',
    };
    render(<NewRecipeModal {...defaultProps} editRecipe={editRecipe as Parameters<typeof NewRecipeModal>[0]['editRecipe']} />);
    expect(screen.getByText('Edit Recipe')).toBeTruthy();
  });

  it('shows tab buttons when not editing', () => {
    render(<NewRecipeModal {...defaultProps} />);
    // "Manual" appears as both "Manual" (mobile) and "Manual Entry" (desktop) - use getAllByText
    expect(screen.getAllByText(/manual/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('AI').length).toBeGreaterThan(0);
    expect(screen.getByText('Discover')).toBeTruthy();
  });

  it('shows Recipe Name field on manual tab', () => {
    render(<NewRecipeModal {...defaultProps} />);
    expect(screen.getByText('Recipe Name *')).toBeTruthy();
  });

  it('shows Ingredients label', () => {
    render(<NewRecipeModal {...defaultProps} />);
    expect(screen.getByText('Ingredients *')).toBeTruthy();
  });

  it('shows Add Ingredient button', () => {
    render(<NewRecipeModal {...defaultProps} />);
    expect(screen.getByText('Add Ingredient')).toBeTruthy();
  });

  it('shows Cancel and Create buttons', () => {
    render(<NewRecipeModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Create')).toBeTruthy();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<NewRecipeModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('switches to AI tab when clicked', () => {
    render(<NewRecipeModal {...defaultProps} />);
    // AI tab button appears twice (mobile/desktop) — click the first
    fireEvent.click(screen.getAllByText('AI')[0]);
    expect(screen.getByText('Paste Recipe Text')).toBeTruthy();
  });
});
