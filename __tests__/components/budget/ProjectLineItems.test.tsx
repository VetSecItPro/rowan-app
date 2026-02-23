// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ProjectLineItems } from '@/components/budget/ProjectLineItems';
import type { ProjectLineItem } from '@/lib/services/project-tracking-service';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

const mockLineItems: ProjectLineItem[] = [
  {
    id: 'item-1',
    project_id: 'project-1',
    description: 'Ceramic Tiles',
    category: 'materials',
    quantity: 1,
    unit_price: null,
    estimated_cost: 3000,
    actual_cost: 2800,
    is_paid: true,
    paid_date: '2026-01-15',
    vendor_id: null,
    notes: 'Premium grade',
    created_at: '2026-01-01',
    updated_at: '2026-01-15',
  },
  {
    id: 'item-2',
    project_id: 'project-1',
    description: 'Plumbing Work',
    category: 'labor',
    quantity: 1,
    unit_price: null,
    estimated_cost: 2000,
    actual_cost: 2500,
    is_paid: false,
    paid_date: null,
    vendor_id: null,
    notes: null,
    created_at: '2026-01-02',
    updated_at: '2026-01-02',
  },
];

const mockCostBreakdown = [
  { category: 'materials', item_count: 1, total_estimated: 3000, total_actual: 2800 },
  { category: 'labor', item_count: 1, total_estimated: 2000, total_actual: 2500 },
];

const defaultProps = {
  projectId: 'project-1',
  lineItems: mockLineItems,
  costBreakdown: mockCostBreakdown,
  onRefresh: vi.fn(),
};

describe('ProjectLineItems', () => {
  it('renders without crashing', () => {
    render(<ProjectLineItems {...defaultProps} />);
    expect(screen.getByText('Ceramic Tiles')).toBeInTheDocument();
  });

  it('renders all line items', () => {
    render(<ProjectLineItems {...defaultProps} />);
    expect(screen.getByText('Ceramic Tiles')).toBeInTheDocument();
    expect(screen.getByText('Plumbing Work')).toBeInTheDocument();
  });

  it('shows All category filter in select', () => {
    render(<ProjectLineItems {...defaultProps} />);
    expect(screen.getByText('All Categories')).toBeInTheDocument();
  });

  it('shows category options in select for each unique category', () => {
    render(<ProjectLineItems {...defaultProps} />);
    // Use getAllByText since the category names appear both in the select options
    // and in the cost breakdown section as span text
    expect(screen.getAllByText('materials').length).toBeGreaterThan(0);
    expect(screen.getAllByText('labor').length).toBeGreaterThan(0);
  });

  it('filters items by category when select changes', () => {
    render(<ProjectLineItems {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    // First select is the category filter
    fireEvent.change(selects[0], { target: { value: 'materials' } });
    expect(screen.getByText('Ceramic Tiles')).toBeInTheDocument();
    expect(screen.queryByText('Plumbing Work')).not.toBeInTheDocument();
  });

  it('shows cost totals', () => {
    render(<ProjectLineItems {...defaultProps} />);
    // Total estimated: 3000 + 2000 = 5000
    expect(screen.getAllByText(/5,000/).length).toBeGreaterThan(0);
  });

  it('shows variance amount', () => {
    render(<ProjectLineItems {...defaultProps} />);
    expect(screen.getByText(/Variance/i)).toBeInTheDocument();
  });

  it('renders empty state when no line items', () => {
    render(<ProjectLineItems {...defaultProps} lineItems={[]} costBreakdown={[]} />);
    expect(screen.queryByText('Ceramic Tiles')).not.toBeInTheDocument();
  });

  it('shows sort options in select', () => {
    render(<ProjectLineItems {...defaultProps} />);
    expect(screen.getByText('Sort by Category')).toBeInTheDocument();
  });
});
