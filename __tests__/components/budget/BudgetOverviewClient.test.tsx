// @vitest-environment jsdom
/**
 * Tests for BudgetOverviewClient (PR14). The component now sources its data from
 * the useBudgetData hook (not a spaceId prop), so we mock that hook and drive
 * loading / has-budget / empty states through it.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetOverviewClient from '@/components/budget/BudgetOverviewClient';

type BudgetState = {
  loading: boolean;
  monthlyBudget: number;
};

const state: BudgetState = { loading: false, monthlyBudget: 5000 };

vi.mock('@/lib/hooks/useBudgetData', () => ({
  useBudgetData: () => ({
    currentSpace: { id: 'space-1' },
    user: { id: 'user-1' },
    loading: state.loading,
    currentBudget: state.monthlyBudget,
    budgetStats: {
      monthlyBudget: state.monthlyBudget,
      spentThisMonth: state.monthlyBudget > 0 ? 2000 : 0,
      remaining: state.monthlyBudget > 0 ? 3000 : 0,
      pendingBills: 2,
    },
    budgetTemplates: [],
    templateCategories: {},
    setBudget: vi.fn(),
    applyTemplate: vi.fn(),
  }),
}));

vi.mock('@/lib/services/bills-service', () => ({
  getBillStats: vi.fn().mockResolvedValue({ totalAmountDue: 500, upcomingCount: 3 }),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: object, tag: string) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as keyof JSX.IntrinsicElements, props as React.HTMLAttributes<HTMLElement>, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/layout/FeatureLayout', () => ({
  FeatureLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="feature-layout">{children}</div>,
}));
vi.mock('@/components/budget/BudgetTabBar', () => ({
  BudgetTabBar: () => <div data-testid="budget-tab-bar">BudgetTabBar</div>,
}));
vi.mock('@/components/projects/SafeToSpendIndicator', () => ({
  SafeToSpendIndicator: () => <div data-testid="safe-to-spend" />,
}));
vi.mock('@/components/ui/CollapsibleStatsGrid', () => ({
  CollapsibleStatsGrid: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="stats-grid">{title}{children}</div>
  ),
}));
vi.mock('@/components/ui/EnhancedButton', () => ({
  CTAButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
vi.mock('@/lib/utils/lazy-components', () => ({
  LazySpendingInsightsCard: () => <div data-testid="insights" />,
  LazyNewBudgetModal: () => null,
  LazyBudgetTemplateModal: () => null,
}));

describe('BudgetOverviewClient', () => {
  beforeEach(() => {
    state.loading = false;
    state.monthlyBudget = 5000;
    vi.clearAllMocks();
  });

  it('renders the header and tab bar', () => {
    render(<BudgetOverviewClient />);
    expect(screen.getByText('Budget Overview')).toBeInTheDocument();
    expect(screen.getByTestId('budget-tab-bar')).toBeInTheDocument();
  });

  it('shows the loading state while data loads', () => {
    state.loading = true;
    render(<BudgetOverviewClient />);
    expect(screen.getByText('Loading budget data...')).toBeInTheDocument();
  });

  it('renders the budget summary stats when a budget is set', () => {
    render(<BudgetOverviewClient />);
    expect(screen.getByText('Budget Summary')).toBeInTheDocument();
  });

  it('shows the spending progress section when a budget is set', () => {
    render(<BudgetOverviewClient />);
    expect(screen.getByText('Monthly Spending')).toBeInTheDocument();
  });

  it('renders quick links to the budget sub-views', () => {
    render(<BudgetOverviewClient />);
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Recurring')).toBeInTheDocument();
    expect(screen.getByText('Receipts')).toBeInTheDocument();
    expect(screen.getByText('Vendors')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('shows the empty state when no budget is set', () => {
    state.monthlyBudget = 0;
    render(<BudgetOverviewClient />);
    expect(screen.getByText('No Budget Set Yet')).toBeInTheDocument();
  });
});
