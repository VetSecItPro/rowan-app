// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/services/recurring-expenses-service', () => ({
  getRecurringPatterns: vi.fn().mockResolvedValue([]),
  analyzeRecurringPatterns: vi.fn().mockResolvedValue([]),
  detectDuplicateSubscriptions: vi.fn().mockResolvedValue([]),
  confirmPattern: vi.fn().mockResolvedValue(undefined),
  ignorePattern: vi.fn().mockResolvedValue(undefined),
  createExpenseFromPattern: vi.fn().mockResolvedValue(undefined),
  getUpcomingRecurring: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('RecurringPatternsCard', () => {
  it('renders without crashing', async () => {
    const { RecurringPatternsCard } = await import('@/components/projects/RecurringPatternsCard');
    const { container } = render(<RecurringPatternsCard spaceId="space-1" userId="user-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders tabs after loading', async () => {
    const { RecurringPatternsCard } = await import('@/components/projects/RecurringPatternsCard');
    render(<RecurringPatternsCard spaceId="space-1" userId="user-1" />);
    await waitFor(() => {
      // Tab text includes count e.g. "Detected (0)" and "Upcoming (0)" and "Duplicates (0)"
      // Use getAllByText since "Detected" appears in both tab button and in a paragraph
      const detectedElements = screen.getAllByText(/Detected/);
      expect(detectedElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Upcoming/)).toBeTruthy();
      expect(screen.getByText(/Duplicates/)).toBeTruthy();
    });
  });

  it('renders Analyze button', async () => {
    const { RecurringPatternsCard } = await import('@/components/projects/RecurringPatternsCard');
    render(<RecurringPatternsCard spaceId="space-1" userId="user-1" />);
    await waitFor(() => {
      // Use getAllByText since there may be multiple matches, just verify at least one exists
      const analyzeButtons = screen.getAllByText(/Analyze/);
      expect(analyzeButtons.length).toBeGreaterThan(0);
    });
  });
});
