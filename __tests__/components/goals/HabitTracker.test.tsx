// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, session: null, loading: false, signOut: vi.fn() })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/services/recurring-goals-service', () => ({
  recurringGoalsService: {
    getTodaysHabits: vi.fn().mockResolvedValue([]),
    calculateCompletionRate: vi.fn().mockResolvedValue({ rate: 0, completed: 0, total: 0, streak: 0 }),
    upsertHabitEntry: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { HabitTracker } from '@/components/goals/HabitTracker';

describe('HabitTracker', () => {
  it('renders without crashing', () => {
    const { container } = render(<HabitTracker spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { container } = render(<HabitTracker spaceId="space-1" />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders with a valid spaceId', () => {
    const { container } = render(<HabitTracker spaceId="space-1" />);
    expect(container.firstChild).toBeTruthy();
  });
});
