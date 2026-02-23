// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectDashboard } from '@/components/budget/ProjectDashboard';
import type { Project, ProjectLineItem } from '@/lib/services/project-tracking-service';

vi.mock('@/components/charts/DynamicCharts', () => ({
  DynamicPieChart: () => <div data-testid="pie-chart">PieChart</div>,
  DynamicBarChart: () => <div data-testid="bar-chart">BarChart</div>,
}));

const mockProject: Project = {
  id: 'project-1',
  space_id: 'space-1',
  name: 'Bathroom Renovation',
  status: 'in_progress',
  priority: 'high',
  start_date: '2026-01-01',
  estimated_budget: 8000,
  actual_cost: 6000,
  budget_variance: 2000,
  variance_percentage: 25,
  created_at: '2026-01-01',
  estimated_completion_date: '2026-04-01',
  actual_completion_date: null,
  description: 'Full bathroom remodel',
  location: 'Main bathroom',
  tags: null,
  created_by: 'user-1',
  updated_at: '2026-01-15',
};

const mockLineItems: ProjectLineItem[] = [
  {
    id: 'item-1',
    project_id: 'project-1',
    description: 'Tiles',
    category: 'materials',
    quantity: 1,
    unit_price: null,
    estimated_cost: 3000,
    actual_cost: 2500,
    is_paid: true,
    paid_date: '2026-01-15',
    vendor_id: null,
    notes: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-15',
  },
  {
    id: 'item-2',
    project_id: 'project-1',
    description: 'Plumbing',
    category: 'labor',
    quantity: 1,
    unit_price: null,
    estimated_cost: 5000,
    actual_cost: 3500,
    is_paid: false,
    paid_date: null,
    vendor_id: null,
    notes: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

const mockCostBreakdown = [
  { category: 'materials', total_estimated: 3000, total_actual: 2500 },
  { category: 'labor', total_estimated: 5000, total_actual: 3500 },
];

const defaultProps = {
  project: mockProject,
  lineItems: mockLineItems,
  costBreakdown: mockCostBreakdown,
  expenses: [],
  onRefresh: vi.fn(),
};

describe('ProjectDashboard', () => {
  it('renders without crashing', () => {
    render(<ProjectDashboard {...defaultProps} />);
    expect(screen.getByText('Under Budget')).toBeInTheDocument();
  });

  it('displays financial status based on variance_percentage', () => {
    render(<ProjectDashboard {...defaultProps} />);
    // variance_percentage=25 > 0 shows "Under Budget"
    expect(screen.getByText('Under Budget')).toBeInTheDocument();
  });

  it('displays project status indicator', () => {
    render(<ProjectDashboard {...defaultProps} />);
    // estimated completion is future: shows "On Track"
    expect(screen.getByText(/On Track|Overdue/i)).toBeInTheDocument();
  });

  it('shows total actual cost from line items', () => {
    render(<ProjectDashboard {...defaultProps} />);
    // totalActual = 2500 + 3500 = 6000, rendered as $6,000
    // Use regex to find "6,000" anywhere in the document
    expect(screen.getAllByText(/6,000/).length).toBeGreaterThan(0);
  });

  it('shows estimated cost reference', () => {
    render(<ProjectDashboard {...defaultProps} />);
    // totalEstimated = 3000 + 5000 = 8000, rendered as $8,000
    expect(screen.getAllByText(/8,000/).length).toBeGreaterThan(0);
  });

  it('shows paid/pending item count', () => {
    render(<ProjectDashboard {...defaultProps} />);
    // 1 paid, 2 total — rendered as "1 of 2"
    expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
  });

  it('shows location info when provided', () => {
    render(<ProjectDashboard {...defaultProps} />);
    expect(screen.getByText('Main bathroom')).toBeInTheDocument();
  });

  it('renders pie chart for status breakdown', () => {
    render(<ProjectDashboard {...defaultProps} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders bar chart for category cost comparison', () => {
    render(<ProjectDashboard {...defaultProps} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
