// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealCard } from '@/components/meals/MealCard';
import type { Meal } from '@/lib/services/meals-service';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn(() => 'Jan 1, 2026'),
  parseDateString: vi.fn(() => new Date('2030-01-01')), // Future date so not past
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const makeMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'meal-1',
  space_id: 'space-1',
  name: 'Test Dinner',
  meal_type: 'dinner',
  scheduled_date: '2030-01-01',
  notes: null,
  recipe_id: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('MealCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MealCard meal={makeMeal()} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  it('displays the meal name', () => {
    render(<MealCard meal={makeMeal({ name: 'Family Pasta' })} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Family Pasta')).toBeTruthy();
  });

  it('displays the meal type in the date label', () => {
    render(<MealCard meal={makeMeal({ meal_type: 'breakfast' })} onEdit={vi.fn()} onDelete={vi.fn()} />);
    // meal_type appears inside text like "breakfast • Jan 1, 2026"
    expect(screen.getByText(/breakfast/)).toBeTruthy();
  });

  it('shows options menu when menu button clicked', () => {
    render(<MealCard meal={makeMeal()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const menuBtn = screen.getByLabelText(/meal options menu/i);
    fireEvent.click(menuBtn);
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onEdit when Edit is clicked', () => {
    const onEdit = vi.fn();
    const meal = makeMeal();
    render(<MealCard meal={meal} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/meal options menu/i));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(meal);
  });

  it('calls onDelete when Delete is clicked', () => {
    const onDelete = vi.fn();
    render(<MealCard meal={makeMeal()} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText(/meal options menu/i));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('meal-1');
  });

  it('shows notes when provided', () => {
    render(
      <MealCard meal={makeMeal({ notes: 'Extra spicy please' })} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText('Extra spicy please')).toBeTruthy();
  });

  it('shows recipe name from recipe when meal has a recipe', () => {
    const meal = makeMeal({
      name: '',
      recipe: { id: 'r-1', name: 'Spaghetti Bolognese', space_id: 'space-1' } as Meal['recipe'],
    });
    render(<MealCard meal={meal} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Spaghetti Bolognese')).toBeTruthy();
  });
});
