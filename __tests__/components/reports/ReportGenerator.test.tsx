// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/financial-reports-service', () => ({
  generateReport: vi.fn().mockResolvedValue({
    id: 'report-1',
    title: 'Test Report',
    status: 'generated',
  }),
  getReportTemplates: vi.fn().mockResolvedValue([]),
  getGeneratedReports: vi.fn().mockResolvedValue([]),
  downloadReportPDF: vi.fn().mockResolvedValue(undefined),
  deleteReport: vi.fn().mockResolvedValue(undefined),
  toggleReportFavorite: vi.fn().mockResolvedValue(undefined),
  getReportShareUrl: vi.fn().mockResolvedValue(''),
  updateReportViews: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('date-fns')>();
  return {
    ...actual,
    format: vi.fn((date: Date) => date.toISOString().split('T')[0]),
  };
});

import { ReportGenerator } from '@/components/reports/ReportGenerator';
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

const defaultProps = {
  template: mockTemplate,
  spaceId: 'space-1',
  onReportGenerated: vi.fn(),
  onCancel: vi.fn(),
};

describe('ReportGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ReportGenerator {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the "Generate Report" heading', () => {
    render(<ReportGenerator {...defaultProps} />);
    // There may be multiple "Generate Report" texts (heading + button)
    expect(screen.getAllByText('Generate Report').length).toBeGreaterThan(0);
  });

  it('renders the template info', () => {
    render(<ReportGenerator {...defaultProps} />);
    expect(screen.getAllByText('Monthly Budget Report').length).toBeGreaterThan(0);
  });

  it('renders Report Title input', () => {
    render(<ReportGenerator {...defaultProps} />);
    const input = screen.getByDisplayValue('Monthly Budget Report');
    expect(input).toBeTruthy();
  });

  it('renders the date preset select', () => {
    render(<ReportGenerator {...defaultProps} />);
    expect(screen.getByText('Time Period')).toBeTruthy();
    expect(screen.getByText('Current Month')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<ReportGenerator {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders Generate Report submit button', () => {
    render(<ReportGenerator {...defaultProps} />);
    const generateBtns = screen.getAllByText('Generate Report');
    expect(generateBtns.length).toBeGreaterThan(0);
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<ReportGenerator {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders requirements notice when template has requirements', () => {
    render(<ReportGenerator {...defaultProps} />);
    // The text may be split across elements or wrapped with a bullet point prefix
    expect(screen.getByText(/budget data is required/i)).toBeTruthy();
  });

  it('renders generation time estimate', () => {
    render(<ReportGenerator {...defaultProps} />);
    expect(screen.getByText(/Estimated generation time/)).toBeTruthy();
  });
});
