// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TwoWeekCalendarView } from '@/components/meals/TwoWeekCalendarView';
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

describe('TwoWeekCalendarView', () => {
  const defaultProps = {
    currentWeek: new Date('2026-02-16'),
    meals: [],
    onWeekChange: vi.fn(),
    onMealClick: vi.fn(),
    onAddMeal: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<TwoWeekCalendarView {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows previous and next navigation buttons', () => {
    render(<TwoWeekCalendarView {...defaultProps} />);
    expect(screen.getByTitle('Previous 2 weeks')).toBeTruthy();
    expect(screen.getByTitle('Next 2 weeks')).toBeTruthy();
  });

  it('calls onWeekChange when previous clicked', () => {
    const onWeekChange = vi.fn();
    render(<TwoWeekCalendarView {...defaultProps} onWeekChange={onWeekChange} />);
    fireEvent.click(screen.getByTitle('Previous 2 weeks'));
    expect(onWeekChange).toHaveBeenCalled();
  });

  it('calls onWeekChange when next clicked', () => {
    const onWeekChange = vi.fn();
    render(<TwoWeekCalendarView {...defaultProps} onWeekChange={onWeekChange} />);
    fireEvent.click(screen.getByTitle('Next 2 weeks'));
    expect(onWeekChange).toHaveBeenCalled();
  });

  it('shows Week 1 and Week 2 labels', () => {
    render(<TwoWeekCalendarView {...defaultProps} />);
    expect(screen.getByText('Week 1')).toBeTruthy();
    expect(screen.getByText('Week 2')).toBeTruthy();
  });

  it('shows Select for Delete button', () => {
    render(<TwoWeekCalendarView {...defaultProps} />);
    expect(screen.getByText('Select for Delete')).toBeTruthy();
  });

  it('shows Generate Shopping List button when provided', () => {
    render(<TwoWeekCalendarView {...defaultProps} onGenerateList={vi.fn()} />);
    expect(screen.getByText('Generate Shopping List')).toBeTruthy();
  });

  it('shows meal names when meals present', () => {
    const meals = [makeMeal({ name: 'Weekend Feast', scheduled_date: '2026-02-17' })];
    render(<TwoWeekCalendarView {...defaultProps} meals={meals} />);
    expect(screen.getAllByText('Weekend Feast').length).toBeGreaterThan(0);
  });
});
