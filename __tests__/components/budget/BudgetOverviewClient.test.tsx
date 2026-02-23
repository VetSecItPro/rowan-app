// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BudgetOverviewClient from '@/components/budget/BudgetOverviewClient';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/budget'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: object, tag: string) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as keyof JSX.IntrinsicElements, props as React.HTMLAttributes<HTMLElement>, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    getBudgetStats: vi.fn().mockResolvedValue({
      monthlyBudget: 5000,
      spentThisMonth: 2000,
      remaining: 3000,
      pendingBills: 2,
    }),
  },
}));

vi.mock('@/lib/services/bills-service', () => ({
  getBillStats: vi.fn().mockResolvedValue({
    totalAmountDue: 500,
    upcomingCount: 3,
  }),
  getBills: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/layout/FeatureLayout', () => ({
  FeatureLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="feature-layout">{children}</div>,
}));

vi.mock('@/components/budget/BudgetTabBar', () => ({
  BudgetTabBar: () => <div data-testid="budget-tab-bar">BudgetTabBar</div>,
}));

vi.mock('@/components/ui/CollapsibleStatsGrid', () => ({
  CollapsibleStatsGrid: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="stats-grid">{title}{children}</div>
  ),
}));

describe('BudgetOverviewClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<BudgetOverviewClient spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Budget Overview')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<BudgetOverviewClient spaceId="space-1" />);
    expect(screen.getByText('Loading budget data...')).toBeInTheDocument();
  });

  it('renders BudgetTabBar', () => {
    render(<BudgetOverviewClient spaceId="space-1" />);
    expect(screen.getByTestId('budget-tab-bar')).toBeInTheDocument();
  });

  it('renders quick action links after loading', async () => {
    render(<BudgetOverviewClient spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Manage Bills')).toBeInTheDocument();
    });
  });

  it('renders budget stats after loading', async () => {
    render(<BudgetOverviewClient spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Budget Summary')).toBeInTheDocument();
    });
  });

  it('shows spending progress bar when budget is set', async () => {
    render(<BudgetOverviewClient spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Monthly Spending')).toBeInTheDocument();
    });
  });

  it('shows all quick action links', async () => {
    render(<BudgetOverviewClient spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Manage Bills')).toBeInTheDocument();
      expect(screen.getByText('Budget Goals')).toBeInTheDocument();
      expect(screen.getByText('Recurring Expenses')).toBeInTheDocument();
    });
  });

  it('shows empty state when no budget is set', async () => {
    const { projectsService } = await import('@/lib/services/budgets-service');
    vi.mocked(projectsService.getBudgetStats).mockResolvedValueOnce({
      monthlyBudget: 0,
      spentThisMonth: 0,
      remaining: 0,
      pendingBills: 0,
    });
    render(<BudgetOverviewClient spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No Budget Set Yet')).toBeInTheDocument();
    });
  });
});
