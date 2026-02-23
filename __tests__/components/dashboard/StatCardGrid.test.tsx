// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
       
      const { variants, initial, animate, exit, whileHover, ...rest } = props as Record<string, unknown>;
      return React.createElement(tag as string, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatDate: vi.fn((d: string) => d),
  formatTimestamp: vi.fn((_ts: string) => 'Jan 1, 9:00 AM'),
  getCurrentDateString: vi.fn(() => '2026-02-22'),
}));

import { StatCardGrid } from '@/components/dashboard/StatCardGrid';
import type { EnhancedDashboardStats } from '@/lib/hooks/useDashboardStats';

const mockStats: EnhancedDashboardStats = {
  tasks: { pending: 3, inProgress: 1, completed: 5, total: 9, overdue: 0, dueToday: 1, highPriority: 2, assignedToMe: 3, trend: 'up', recentTasks: [] },
  events: { upcoming: 2, today: 1, thisWeek: 3, personal: 1, shared: 2, trend: 'neutral', nextEvent: null },
  reminders: { active: 4, overdue: 0, dueToday: 2, completed: 3, total: 7, trend: 'neutral', nextDue: null },
  messages: { total: 12, today: 3, conversations: 2, unread: 1, trend: 'up', lastMessage: null },
  shopping: { uncheckedItems: 6, totalLists: 2, activeLists: 1, checkedToday: 3, trend: 'neutral', urgentList: null },
  meals: { mealsToday: 2, thisWeek: 8, savedRecipes: 15, trend: 'neutral', nextMeal: null },
  household: { spent: 1200, monthlyBudget: 2000, pendingBills: 2 },
  projects: { inProgress: 1, completed: 3, planning: 0, onHold: 0, trend: 'neutral', totalExpenses: 500 },
  goals: { active: 4, inProgress: 2, completed: 1, total: 7, overallProgress: 45, trend: 'up', topGoal: null },
};

describe('StatCardGrid', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatCardGrid stats={mockStats} loading={false} />);
    expect(container).toBeTruthy();
  });

  it('shows loading skeleton when loading is true', () => {
    const { container } = render(<StatCardGrid stats={mockStats} loading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders 8 skeleton cards when loading', () => {
    const { container } = render(<StatCardGrid stats={mockStats} loading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(8);
  });

  it('shows stat cards when not loading', () => {
    render(<StatCardGrid stats={mockStats} loading={false} />);
    expect(screen.getByText('Tasks & Chores')).toBeTruthy();
    expect(screen.getByText('Calendar')).toBeTruthy();
    expect(screen.getByText('Reminders')).toBeTruthy();
    expect(screen.getByText('Messages')).toBeTruthy();
  });

  it('shows Shopping and Meals cards', () => {
    render(<StatCardGrid stats={mockStats} loading={false} />);
    expect(screen.getByText('Shopping')).toBeTruthy();
    expect(screen.getByText('Meals')).toBeTruthy();
  });

  it('shows Projects & Budget and Goals cards', () => {
    render(<StatCardGrid stats={mockStats} loading={false} />);
    expect(screen.getByText('Projects & Budget')).toBeTruthy();
    expect(screen.getByText('Goals')).toBeTruthy();
  });

  it('shows task count values', () => {
    render(<StatCardGrid stats={mockStats} loading={false} />);
    // pending tasks = 3
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('displays overall progress for goals', () => {
    render(<StatCardGrid stats={mockStats} loading={false} />);
    expect(screen.getByText(/45%/)).toBeTruthy();
  });
});
