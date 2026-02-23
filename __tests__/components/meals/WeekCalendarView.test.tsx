// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeekCalendarView } from '@/components/meals/WeekCalendarView';
import type { Meal } from '@/lib/services/meals-service';

vi.mock('@/lib/utils/date-utils', () => ({
  parseDateString: vi.fn((date: string) => new Date(date + 'T12:00:00Z')),
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
  recipe: null,
  assignee: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('WeekCalendarView', () => {
  const defaultProps = {
    currentWeek: new Date('2026-02-16'),
    meals: [],
    onWeekChange: vi.fn(),
    onMealClick: vi.fn(),
    onAddMeal: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<WeekCalendarView {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows previous and next week navigation buttons', () => {
    render(<WeekCalendarView {...defaultProps} />);
    expect(screen.getByTitle('Previous week')).toBeTruthy();
    expect(screen.getByTitle('Next week')).toBeTruthy();
  });

  it('calls onWeekChange when previous week is clicked', () => {
    const onWeekChange = vi.fn();
    render(<WeekCalendarView {...defaultProps} onWeekChange={onWeekChange} />);
    fireEvent.click(screen.getByTitle('Previous week'));
    expect(onWeekChange).toHaveBeenCalled();
  });

  it('calls onWeekChange when next week is clicked', () => {
    const onWeekChange = vi.fn();
    render(<WeekCalendarView {...defaultProps} onWeekChange={onWeekChange} />);
    fireEvent.click(screen.getByTitle('Next week'));
    expect(onWeekChange).toHaveBeenCalled();
  });

  it('shows Select for Delete button', () => {
    render(<WeekCalendarView {...defaultProps} />);
    expect(screen.getByText('Select for Delete')).toBeTruthy();
  });

  it('shows Generate Shopping List button when onGenerateList provided', () => {
    render(<WeekCalendarView {...defaultProps} onGenerateList={vi.fn()} />);
    expect(screen.getByText('Generate Shopping List')).toBeTruthy();
  });

  it('renders meal names when meals are present', () => {
    const meals = [makeMeal({ name: 'Sunday Roast', scheduled_date: '2026-02-15' })];
    render(<WeekCalendarView {...defaultProps} meals={meals} />);
    expect(screen.getAllByText('Sunday Roast').length).toBeGreaterThan(0);
  });

  it('shows Add Meal button for empty days', () => {
    render(<WeekCalendarView {...defaultProps} />);
    expect(screen.getAllByText('+ Add Meal').length).toBeGreaterThan(0);
  });
});
