// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetVarianceCard } from '@/components/budget/BudgetVarianceCard';
import type { Project, ProjectLineItem } from '@/lib/services/project-tracking-service';

vi.mock('@/components/charts/DynamicCharts', () => ({
  DynamicBarChart: () => <div data-testid="bar-chart">BarChart</div>,
  DynamicPieChart: () => <div data-testid="pie-chart">PieChart</div>,
}));

const mockProject: Project = {
  id: 'project-1',
  space_id: 'space-1',
  name: 'Kitchen Remodel',
  status: 'in_progress',
  estimated_budget: 10000,
  actual_cost: 12000,
  created_at: '2026-01-01',
  estimated_completion_date: null,
  description: null,
  location: null,
  contractor: null,
  permit_required: false,
  updated_at: '2026-01-01',
};

const mockLineItems: ProjectLineItem[] = [
  {
    id: 'item-1',
    project_id: 'project-1',
    description: 'Cabinets',
    category: 'materials',
    estimated_cost: 5000,
    actual_cost: 6000,
    is_paid: true,
    vendor: null,
    notes: null,
    due_date: null,
    created_at: '2026-01-01',
  },
  {
    id: 'item-2',
    project_id: 'project-1',
    description: 'Labor',
    category: 'labor',
    estimated_cost: 5000,
    actual_cost: 6000,
    is_paid: false,
    vendor: null,
    notes: null,
    due_date: null,
    created_at: '2026-01-01',
  },
];

describe('BudgetVarianceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    expect(screen.getByText('Budget Variance Alert')).toBeInTheDocument();
  });

  it('shows over budget message', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    expect(screen.getByText(/over budget/)).toBeInTheDocument();
  });

  it('shows variance amount', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    expect(screen.getByText('Variance')).toBeInTheDocument();
  });

  it('shows Adjust Budget button', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    expect(screen.getByText('Adjust Budget')).toBeInTheDocument();
  });

  it('toggles detail view when View Details button clicked', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    fireEvent.click(screen.getByText('View Details'));
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
  });

  it('shows charts when details are expanded', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    fireEvent.click(screen.getByText('View Details'));
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('opens budget adjustment modal', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    fireEvent.click(screen.getByText('Adjust Budget'));
    expect(screen.getByText('Adjust Project Budget')).toBeInTheDocument();
  });

  it('closes adjustment modal on Cancel', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    fireEvent.click(screen.getByText('Adjust Budget'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Adjust Project Budget')).not.toBeInTheDocument();
  });

  it('calls onUpdateBudget with correct value', () => {
    const onUpdateBudget = vi.fn();
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} onUpdateBudget={onUpdateBudget} />);
    fireEvent.click(screen.getByText('Adjust Budget'));
    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '15000' } });
    fireEvent.click(screen.getByText('Update Budget'));
    expect(onUpdateBudget).toHaveBeenCalledWith(15000);
  });

  it('shows recommended actions section', () => {
    render(<BudgetVarianceCard project={mockProject} lineItems={mockLineItems} />);
    expect(screen.getByText('Recommended Actions')).toBeInTheDocument();
  });
});
