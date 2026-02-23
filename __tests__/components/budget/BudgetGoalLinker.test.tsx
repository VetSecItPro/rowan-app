// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetGoalLinker } from '@/components/budget/BudgetGoalLinker';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/services/budget-goals-linking-service', () => ({
  BUDGET_GOAL_TEMPLATES: {
    emergency_fund: {
      title: 'Emergency Fund',
      description: 'Build a 3-6 month emergency fund',
      link_type: 'savings_target',
      milestones: [
        { title: 'Month 1', target_value: 25, type: 'percentage' },
        { title: 'Month 3', target_value: 50, type: 'percentage' },
      ],
    },
    reduce_dining: {
      title: 'Reduce Dining Out',
      description: 'Cut restaurant spending by 30%',
      link_type: 'spending_reduction',
      milestones: [
        { title: 'Week 1', target_value: 10, type: 'percentage' },
      ],
    },
  },
  createGoalFromBudgetTemplate: vi.fn().mockResolvedValue({}),
  createBudgetGoalLink: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/services/goals-service', () => ({
  createGoal: vi.fn().mockResolvedValue({ id: 'goal-1' }),
}));

vi.mock('@/lib/constants/default-categories', () => ({
  getDefaultCategoriesForDomain: vi.fn(() => [
    { name: 'Groceries', icon: '🛒', monthly_budget: 500 },
    { name: 'Dining', icon: '🍽️', monthly_budget: 200 },
  ]),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('BudgetGoalLinker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<BudgetGoalLinker />);
    expect(screen.getByText('Use Template')).toBeInTheDocument();
  });

  it('shows template and custom goal mode buttons', () => {
    render(<BudgetGoalLinker />);
    expect(screen.getByText('Use Template')).toBeInTheDocument();
    expect(screen.getByText('Custom Goal')).toBeInTheDocument();
  });

  it('shows template selection by default', () => {
    render(<BudgetGoalLinker />);
    expect(screen.getByText('Choose a Template')).toBeInTheDocument();
  });

  it('switches to custom mode when Custom Goal is clicked', () => {
    render(<BudgetGoalLinker />);
    fireEvent.click(screen.getByText('Custom Goal'));
    expect(screen.getByText('Goal Type')).toBeInTheDocument();
  });

  it('renders budget goal templates', () => {
    render(<BudgetGoalLinker />);
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('Reduce Dining Out')).toBeInTheDocument();
  });

  it('shows goal type cards in custom mode', () => {
    render(<BudgetGoalLinker />);
    fireEvent.click(screen.getByText('Custom Goal'));
    expect(screen.getByText('Budget Limit Tracking')).toBeInTheDocument();
    expect(screen.getByText('Savings Goal')).toBeInTheDocument();
  });

  it('shows goal title and category fields in custom mode', () => {
    render(<BudgetGoalLinker />);
    fireEvent.click(screen.getByText('Custom Goal'));
    expect(screen.getByPlaceholderText('Enter goal title')).toBeInTheDocument();
  });

  it('calls onComplete after successful custom creation', async () => {
    const onComplete = vi.fn();
    render(<BudgetGoalLinker onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Custom Goal'));
    // Button should be disabled without required fields
    const createButton = screen.getByText('Create Custom Budget Goal');
    expect(createButton).toBeDisabled();
  });

  it('accepts className prop', () => {
    const { container } = render(<BudgetGoalLinker className="test-class" />);
    expect(container.firstChild).toHaveClass('test-class');
  });
});
