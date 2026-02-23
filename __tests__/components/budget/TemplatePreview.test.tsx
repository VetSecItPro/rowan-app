// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplatePreview } from '@/components/budget/TemplatePreview';
import type { BudgetTemplateCategory } from '@/lib/services/budget-templates-service';

const mockCategories: BudgetTemplateCategory[] = [
  {
    id: 'cat-1',
    template_id: 'template-1',
    category_name: 'Housing',
    percentage: 30,
    icon: '🏠',
    color: 'blue',
    sort_order: 1,
    description: 'Rent or mortgage payments',
    created_at: '2026-01-01',
  },
  {
    id: 'cat-2',
    template_id: 'template-1',
    category_name: 'Food',
    percentage: 15,
    icon: '🍔',
    color: 'green',
    sort_order: 2,
    description: 'Groceries and dining',
    created_at: '2026-01-01',
  },
  {
    id: 'cat-3',
    template_id: 'template-1',
    category_name: 'Savings',
    percentage: 20,
    icon: '💰',
    color: 'yellow',
    sort_order: 3,
    description: 'Emergency fund and retirement',
    created_at: '2026-01-01',
  },
];

describe('TemplatePreview', () => {
  it('renders without crashing', () => {
    render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} />);
    expect(screen.getByText('Budget Preview')).toBeInTheDocument();
  });

  it('shows total monthly income', () => {
    render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} />);
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('shows all category names', () => {
    render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} />);
    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
  });

  it('shows calculated amounts for each category', () => {
    render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} />);
    // Housing: 30% of 5000 = 1500
    expect(screen.getByText('$1,500')).toBeInTheDocument();
  });

  it('shows category percentages', () => {
    render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} />);
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('shows total allocated as combined amount', () => {
    render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} />);
    // 30 + 15 + 20 = 65%, $3250 allocated
    expect(screen.getByText(/3,250/)).toBeInTheDocument();
  });

  it('shows under-allocated info when total is under 100%', () => {
    render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} />);
    expect(screen.getByText(/unallocated/i)).toBeInTheDocument();
  });

  it('shows remaining amount', () => {
    render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} />);
    // 5000 - 3250 = 1750 remaining
    expect(screen.getByText('$1,750')).toBeInTheDocument();
  });

  it('shows over-allocated warning when total exceeds 100%', () => {
    const overAllocatedCategories = [
      ...mockCategories,
      {
        id: 'cat-4',
        template_id: 'template-1',
        category_name: 'Extra',
        percentage: 40,
        icon: '📦',
        color: 'red',
        sort_order: 4,
        description: 'Extra expenses',
        created_at: '2026-01-01',
      },
    ];
    render(<TemplatePreview categories={overAllocatedCategories} monthlyIncome={5000} />);
    expect(screen.getByText(/Warning/i)).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    const { container } = render(<TemplatePreview categories={mockCategories} monthlyIncome={5000} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
