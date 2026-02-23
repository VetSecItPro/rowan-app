// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateGallery } from '@/components/budget/TemplateGallery';
import type { BudgetTemplate } from '@/lib/services/budget-templates-service';

vi.mock('@/components/budget/TemplateCard', () => ({
  TemplateCard: ({ template, isSelected, onClick }: { template: BudgetTemplate; isSelected?: boolean; onClick?: () => void }) => (
    <div data-testid="template-card" onClick={onClick}>
      <span>{template.name}</span>
      {isSelected && <span>Selected</span>}
    </div>
  ),
}));

const mockTemplates: BudgetTemplate[] = [
  {
    id: 'template-1',
    name: 'Single Budget',
    description: 'For single adults',
    household_type: 'single',
    icon: '👤',
    sort_order: 1,
    recommended_income_min: 2000,
    recommended_income_max: 5000,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 'template-2',
    name: 'Couple Budget',
    description: 'For couples',
    household_type: 'couple',
    icon: '💑',
    sort_order: 2,
    recommended_income_min: 4000,
    recommended_income_max: 10000,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 'template-3',
    name: 'Family Budget',
    description: 'For small families',
    household_type: 'family_small',
    icon: '👨‍👩‍👧',
    sort_order: 3,
    recommended_income_min: 5000,
    recommended_income_max: null,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

describe('TemplateGallery', () => {
  it('renders without crashing', () => {
    render(<TemplateGallery templates={mockTemplates} />);
    expect(screen.getAllByTestId('template-card').length).toBe(3);
  });

  it('renders all templates', () => {
    render(<TemplateGallery templates={mockTemplates} />);
    expect(screen.getByText('Single Budget')).toBeInTheDocument();
    expect(screen.getByText('Couple Budget')).toBeInTheDocument();
    expect(screen.getByText('Family Budget')).toBeInTheDocument();
  });

  it('shows household type filter select', () => {
    render(<TemplateGallery templates={mockTemplates} />);
    expect(screen.getByLabelText('Household Type')).toBeInTheDocument();
  });

  it('has All Types option in filter', () => {
    render(<TemplateGallery templates={mockTemplates} />);
    expect(screen.getByText('All Types')).toBeInTheDocument();
  });

  it('filters by household type via select', () => {
    render(<TemplateGallery templates={mockTemplates} />);
    const select = screen.getByLabelText('Household Type');
    fireEvent.change(select, { target: { value: 'single' } });
    expect(screen.getAllByTestId('template-card').length).toBe(1);
    expect(screen.getByText('Single Budget')).toBeInTheDocument();
    expect(screen.queryByText('Couple Budget')).not.toBeInTheDocument();
  });

  it('shows only recommended toggle when income is set', () => {
    render(<TemplateGallery templates={mockTemplates} monthlyIncome={5000} />);
    expect(screen.getByText(/recommended for my income/i)).toBeInTheDocument();
  });

  it('calls onTemplateSelect when a template is clicked', () => {
    const onTemplateSelect = vi.fn();
    render(<TemplateGallery templates={mockTemplates} onTemplateSelect={onTemplateSelect} />);
    fireEvent.click(screen.getAllByTestId('template-card')[0]);
    expect(onTemplateSelect).toHaveBeenCalled();
  });

  it('shows empty state when no templates match filter', () => {
    render(<TemplateGallery templates={mockTemplates} />);
    const select = screen.getByLabelText('Household Type');
    fireEvent.change(select, { target: { value: 'retired' } });
    expect(screen.getByText('No Templates Found')).toBeInTheDocument();
  });

  it('shows template count summary', () => {
    render(<TemplateGallery templates={mockTemplates} />);
    expect(screen.getByText(/3 templates available/i)).toBeInTheDocument();
  });

  it('shows Clear Filters button when filters are active', () => {
    render(<TemplateGallery templates={mockTemplates} />);
    const select = screen.getByLabelText('Household Type');
    fireEvent.change(select, { target: { value: 'single' } });
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });
});
