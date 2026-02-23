// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
       
      const { variants, initial, animate, ...rest } = props as Record<string, unknown>;
      return React.createElement(tag as string, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    getEventsWithRecurring: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/services/tasks-service', () => ({
  tasksService: {
    getTasks: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/services/meals-service', () => ({
  mealsService: {
    getMeals: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/services/reminders-service', () => ({
  remindersService: {
    getReminders: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/calendar/WeatherBadge', () => ({
  WeatherBadge: () => React.createElement('div', { 'data-testid': 'weather-badge' }),
}));

vi.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { className: `skeleton ${className || ''}` }),
}));

import { TodayAtAGlance } from '@/components/dashboard/TodayAtAGlance';

describe('TodayAtAGlance', () => {
  it('renders without crashing', () => {
    const { container } = render(<TodayAtAGlance spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { container } = render(<TodayAtAGlance spaceId="space-1" />);
    // Should show skeleton loading state
    expect(container.querySelector('.skeleton')).toBeTruthy();
  });

  it('accepts spaceId prop', () => {
    const { container } = render(<TodayAtAGlance spaceId="space-abc" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<TodayAtAGlance spaceId="space-1" className="custom-class" />);
    expect(container.firstChild).toBeTruthy();
  });
});
