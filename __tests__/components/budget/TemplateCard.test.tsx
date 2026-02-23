// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateCard } from '@/components/budget/TemplateCard';
import type { BudgetTemplate } from '@/lib/services/budget-templates-service';

const mockTemplate: BudgetTemplate = {
  id: 'template-1',
  name: 'Essential Budget',
  description: 'Perfect for basic household management',
  household_type: 'couple',
  icon: '💑',
  sort_order: 1,
  recommended_income_min: 3000,
  recommended_income_max: 8000,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('TemplateCard', () => {
  it('renders without crashing', () => {
    render(<TemplateCard template={mockTemplate} />);
    expect(screen.getByText('Essential Budget')).toBeInTheDocument();
  });

  it('displays template name', () => {
    render(<TemplateCard template={mockTemplate} />);
    expect(screen.getByText('Essential Budget')).toBeInTheDocument();
  });

  it('displays template description', () => {
    render(<TemplateCard template={mockTemplate} />);
    expect(screen.getByText('Perfect for basic household management')).toBeInTheDocument();
  });

  it('shows household type label', () => {
    render(<TemplateCard template={mockTemplate} />);
    expect(screen.getByText('Couple')).toBeInTheDocument();
  });

  it('shows income range when both min and max are set', () => {
    render(<TemplateCard template={mockTemplate} />);
    expect(screen.getByText(/3,000/)).toBeInTheDocument();
  });

  it('shows selected styling when isSelected is true', () => {
    const { container } = render(<TemplateCard template={mockTemplate} isSelected={true} />);
    expect(container.firstChild).toHaveClass('border-amber-500');
  });

  it('shows check icon when selected', () => {
    render(<TemplateCard template={mockTemplate} isSelected={true} />);
    const checkIcon = document.querySelector('[aria-label="Selected"]');
    expect(checkIcon).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows income range in green styling when income in range', () => {
    const { container } = render(<TemplateCard template={mockTemplate} monthlyIncome={5000} />);
    const rangeEl = container.querySelector('.text-green-300');
    expect(rangeEl).toBeTruthy();
  });

  it('shows income range in yellow when income is below minimum', () => {
    const { container } = render(<TemplateCard template={mockTemplate} monthlyIncome={1000} />);
    const rangeEl = container.querySelector('.text-yellow-300');
    expect(rangeEl).toBeTruthy();
  });
});
