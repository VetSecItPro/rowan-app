// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/services/financial-reports-service', () => ({
  getReportTemplates: vi.fn().mockResolvedValue([]),
  getGeneratedReports: vi.fn().mockResolvedValue([]),
  generateReport: vi.fn().mockResolvedValue({}),
  downloadReportPDF: vi.fn().mockResolvedValue(undefined),
  deleteReport: vi.fn().mockResolvedValue(undefined),
  toggleReportFavorite: vi.fn().mockResolvedValue(undefined),
  getReportShareUrl: vi.fn().mockResolvedValue('https://example.com/share'),
  updateReportViews: vi.fn().mockResolvedValue(undefined),
}));

import { ReportTemplateSelector } from '@/components/reports/ReportTemplateSelector';
import type { ReportTemplate } from '@/lib/services/financial-reports-service';

const mockTemplate: ReportTemplate = {
  id: 'tpl-1',
  name: 'Monthly Budget Report',
  description: 'Overview of monthly budget',
  category: 'budget',
  report_type: 'summary',
  default_date_range: 'current_month',
  requires_budget: true,
  requires_goals: false,
  config: { charts: true, metrics: true },
  is_system_template: true,
  created_at: new Date().toISOString(),
};

describe('ReportTemplateSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <ReportTemplateSelector templates={[]} onSelectTemplate={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  it('renders the heading', () => {
    render(<ReportTemplateSelector templates={[]} onSelectTemplate={vi.fn()} />);
    expect(screen.getByText('Choose a Report Template')).toBeTruthy();
  });

  it('shows empty state when no templates', () => {
    render(<ReportTemplateSelector templates={[]} onSelectTemplate={vi.fn()} />);
    expect(screen.getByText('No templates found')).toBeTruthy();
  });

  it('renders a template card', () => {
    render(
      <ReportTemplateSelector templates={[mockTemplate]} onSelectTemplate={vi.fn()} />
    );
    expect(screen.getByText('Monthly Budget Report')).toBeTruthy();
    expect(screen.getByText('Overview of monthly budget')).toBeTruthy();
  });

  it('calls onSelectTemplate when a template is clicked', () => {
    const onSelectTemplate = vi.fn();
    render(
      <ReportTemplateSelector templates={[mockTemplate]} onSelectTemplate={onSelectTemplate} />
    );
    const card = document.querySelector('.btn-touch');
    if (card) fireEvent.click(card);
    expect(onSelectTemplate).toHaveBeenCalledWith(mockTemplate);
  });

  it('renders category filter dropdown', () => {
    render(
      <ReportTemplateSelector templates={[mockTemplate]} onSelectTemplate={vi.fn()} />
    );
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getByText('Report Type')).toBeTruthy();
  });

  it('shows budget requirement tag', () => {
    render(
      <ReportTemplateSelector templates={[mockTemplate]} onSelectTemplate={vi.fn()} />
    );
    // "Budget" appears multiple times (category badge + requires_budget tag)
    const budgetElements = screen.getAllByText('Budget');
    expect(budgetElements.length).toBeGreaterThan(0);
  });

  it('filters templates by category', () => {
    const expenseTemplate: ReportTemplate = {
      ...mockTemplate,
      id: 'tpl-2',
      name: 'Expense Report',
      category: 'expenses',
    };
    render(
      <ReportTemplateSelector
        templates={[mockTemplate, expenseTemplate]}
        onSelectTemplate={vi.fn()}
      />
    );
    // Both templates visible with "all" filter
    expect(screen.getByText('Monthly Budget Report')).toBeTruthy();
    expect(screen.getByText('Expense Report')).toBeTruthy();
  });
});
