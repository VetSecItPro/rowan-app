// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/lib/services/financial-reports-service', () => ({
  downloadReportPDF: vi.fn().mockResolvedValue(undefined),
  deleteReport: vi.fn().mockResolvedValue(undefined),
  toggleReportFavorite: vi.fn().mockResolvedValue(undefined),
  getReportTemplates: vi.fn().mockResolvedValue([]),
  getGeneratedReports: vi.fn().mockResolvedValue([]),
}));

import { ReportLibrary } from '@/components/reports/ReportLibrary';
import type { GeneratedReport } from '@/lib/services/financial-reports-service';

const mockReport: GeneratedReport = {
  id: 'report-1',
  space_id: 'space-1',
  title: 'Monthly Budget Report',
  description: 'Overview of budget for January',
  report_type: 'summary',
  status: 'generated',
  date_range_start: '2024-01-01T00:00:00Z',
  date_range_end: '2024-01-31T00:00:00Z',
  generated_at: new Date().toISOString(),
  view_count: 3,
  download_count: 1,
  pdf_url: 'https://example.com/report.pdf',
  pdf_size: 2048,
  created_at: new Date().toISOString(),
};

const defaultProps = {
  reports: [],
  onViewReport: vi.fn(),
  onReportUpdated: vi.fn(),
};

describe('ReportLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ReportLibrary {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the Report Library heading', () => {
    render(<ReportLibrary {...defaultProps} />);
    expect(screen.getByText('Report Library')).toBeTruthy();
  });

  it('shows empty state when no reports', () => {
    render(<ReportLibrary {...defaultProps} />);
    expect(screen.getByText('No reports yet')).toBeTruthy();
  });

  it('shows report count', () => {
    render(<ReportLibrary {...defaultProps} />);
    expect(screen.getByText('0 reports')).toBeTruthy();
  });

  it('renders search input', () => {
    render(<ReportLibrary {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search reports...')).toBeTruthy();
  });

  it('renders a report card when reports are provided', () => {
    render(<ReportLibrary {...defaultProps} reports={[mockReport]} />);
    expect(screen.getByText('Monthly Budget Report')).toBeTruthy();
  });

  it('renders View button for a report', () => {
    render(<ReportLibrary {...defaultProps} reports={[mockReport]} />);
    expect(screen.getByText('View')).toBeTruthy();
  });

  it('renders Download button when pdf_url is present', () => {
    render(<ReportLibrary {...defaultProps} reports={[mockReport]} />);
    expect(screen.getByText('Download')).toBeTruthy();
  });

  it('renders Delete button', () => {
    render(<ReportLibrary {...defaultProps} reports={[mockReport]} />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onViewReport when View is clicked', () => {
    const onViewReport = vi.fn();
    render(<ReportLibrary {...defaultProps} reports={[mockReport]} onViewReport={onViewReport} />);
    fireEvent.click(screen.getByText('View'));
    expect(onViewReport).toHaveBeenCalledWith(mockReport);
  });

  it('filters reports by search query', () => {
    render(<ReportLibrary {...defaultProps} reports={[mockReport]} />);
    const searchInput = screen.getByPlaceholderText('Search reports...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No reports found')).toBeTruthy();
  });

  it('shows report description when present', () => {
    render(<ReportLibrary {...defaultProps} reports={[mockReport]} />);
    expect(screen.getByText('Overview of budget for January')).toBeTruthy();
  });
});
