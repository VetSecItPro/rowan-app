// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenerateListModal } from '@/components/meals/GenerateListModal';
import type { Meal } from '@/lib/services/meals-service';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/utils/toast', () => ({ showSuccess: vi.fn(), showError: vi.fn() }));
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { list: { id: 'list-1' }, itemCount: 3, recipeCount: 1 } }) }),
}));
vi.mock('@/lib/utils/date-utils', () => ({
  formatDateString: vi.fn(() => 'Jan 1, 2026'),
  formatTimestamp: vi.fn(() => 'Jan 1, 2026'),
}));

const makeMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'meal-1',
  space_id: 'space-1',
  name: 'Pasta Night',
  meal_type: 'dinner',
  scheduled_date: '2026-01-01',
  notes: null,
  recipe_id: 'recipe-1',
  recipe: { id: 'recipe-1', name: 'Pasta', ingredients: ['pasta', 'sauce'] } as Meal['recipe'],
  assignee: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('GenerateListModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    meals: [],
    spaceId: 'space-1',
  };

  it('renders without crashing when closed', () => {
    const { container } = render(<GenerateListModal {...defaultProps} isOpen={false} />);
    expect(container).toBeTruthy();
  });

  it('renders modal title when open', () => {
    render(<GenerateListModal {...defaultProps} />);
    expect(screen.getByText('Generate Shopping List')).toBeTruthy();
  });

  it('shows empty state when no meals with recipes', () => {
    render(<GenerateListModal {...defaultProps} meals={[]} />);
    expect(screen.getByText(/no meals with recipes found/i)).toBeTruthy();
  });

  it('shows meal items when meals have recipes', () => {
    render(<GenerateListModal {...defaultProps} meals={[makeMeal()]} />);
    expect(screen.getByText('Pasta Night')).toBeTruthy();
  });

  it('shows list name input', () => {
    render(<GenerateListModal {...defaultProps} />);
    expect(screen.getByText(/list name/i)).toBeTruthy();
  });

  it('shows Select All button when there are meals', () => {
    render(<GenerateListModal {...defaultProps} meals={[makeMeal()]} />);
    expect(screen.getByText('Select All')).toBeTruthy();
  });

  it('shows Cancel and Generate buttons', () => {
    render(<GenerateListModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Generate')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<GenerateListModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('filters meals to only those with recipes', () => {
    const mealNoRecipe = makeMeal({ recipe: null, recipe_id: null });
    const mealWithRecipe = makeMeal({ id: 'meal-2', name: 'Steak Night' });
    render(<GenerateListModal {...defaultProps} meals={[mealNoRecipe, mealWithRecipe]} />);
    expect(screen.queryByText('Pasta Night')).toBeNull();
    expect(screen.getByText('Steak Night')).toBeTruthy();
  });
});
