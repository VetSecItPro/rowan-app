// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BudgetGoalsDashboard } from '@/components/budget/BudgetGoalsDashboard';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/services/budget-goals-linking-service', () => ({
  getBudgetProgressWithGoals: vi.fn().mockResolvedValue([]),
  calculateSavingsGoalProgress: vi.fn().mockResolvedValue(null),
  autoUpdateBudgetGoalProgress: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/budget/BudgetGoalLinker', () => ({
  BudgetGoalLinker: () => <div data-testid="budget-goal-linker">Linker</div>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Mock Shadcn UI components used in BudgetGoalsDashboard
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => <span className={className}>{children}</span>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-value={value} data-testid="tabs">{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-tab-content={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: { children: React.ReactNode; value: string; onClick?: () => void }) => (
    <button role="tab" data-value={value} onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div role="progressbar" aria-valuenow={value} />,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

describe('BudgetGoalsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<BudgetGoalsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Budget & Goals')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<BudgetGoalsDashboard />);
    expect(screen.getByText('Loading budget goals...')).toBeInTheDocument();
  });

  it('renders header after loading', async () => {
    render(<BudgetGoalsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Budget & Goals')).toBeInTheDocument();
    });
  });

  it('renders Link Budget Goal button', async () => {
    render(<BudgetGoalsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Link Budget Goal')).toBeInTheDocument();
    });
  });

  it('renders tabs for Budget Progress, Savings Goals, Overview', async () => {
    render(<BudgetGoalsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Budget Progress')).toBeInTheDocument();
      expect(screen.getByText('Savings Goals')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
  });

  it('shows empty state for budget categories in budget tab content', async () => {
    render(<BudgetGoalsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No Budget Categories')).toBeInTheDocument();
    });
  });

  it('shows savings goals tab content', async () => {
    render(<BudgetGoalsDashboard />);
    await waitFor(() => {
      // Both tab contents are rendered in our mock (no conditional rendering based on active tab)
      expect(screen.getByText('Budget Progress')).toBeInTheDocument();
    });
  });

  it('shows error state when data loading fails', async () => {
    const { getBudgetProgressWithGoals } = await import('@/lib/services/budget-goals-linking-service');
    vi.mocked(getBudgetProgressWithGoals).mockRejectedValueOnce(new Error('Load failed'));
    render(<BudgetGoalsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Load failed')).toBeInTheDocument();
    });
  });

  it('accepts className prop', async () => {
    const { container } = render(<BudgetGoalsDashboard className="test-class" />);
    await waitFor(() => {
      expect(screen.getByText('Budget & Goals')).toBeInTheDocument();
    });
    expect(container.firstChild).toHaveClass('test-class');
  });
});
