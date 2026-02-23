// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('date-fns', () => ({
  format: vi.fn((_date: Date, fmt: string) => fmt === 'MMM d' ? 'Jan 1' : 'Jan 31, 2024'),
}));

vi.mock('@/lib/services/financial-reports-service', () => ({
  downloadReportPDF: vi.fn().mockResolvedValue(undefined),
  getReportShareUrl: vi.fn().mockResolvedValue('https://example.com/share/abc'),
  updateReportViews: vi.fn().mockResolvedValue(undefined),
  getReportTemplates: vi.fn().mockResolvedValue([]),
  getGeneratedReports: vi.fn().mockResolvedValue([]),
}));

import { ReportViewer } from '@/components/reports/ReportViewer';
import type { GeneratedReport } from '@/lib/services/financial-reports-service';
import * as financialReportsService from '@/lib/services/financial-reports-service';

const mockReport: GeneratedReport = {
  id: 'report-1',
  space_id: 'space-1',
  title: 'Q1 Financial Summary',
  description: 'First quarter financial overview',
  report_type: 'summary',
  status: 'generated',
  date_range_start: '2024-01-01T00:00:00Z',
  date_range_end: '2024-03-31T00:00:00Z',
  generated_at: new Date().toISOString(),
  view_count: 5,
  download_count: 2,
  pdf_url: 'https://example.com/report.pdf',
  pdf_size: 4096,
  created_at: new Date().toISOString(),
};

describe('ReportViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  it('renders the report title', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(screen.getByText('Q1 Financial Summary')).toBeTruthy();
  });

  it('renders the report description', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(screen.getByText('First quarter financial overview')).toBeTruthy();
  });

  it('renders the Share button', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(screen.getByText('Share')).toBeTruthy();
  });

  it('renders the Download PDF button when pdf_url is present', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(screen.getByText('Download PDF')).toBeTruthy();
  });

  it('renders view count metadata', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(screen.getByText('5 views')).toBeTruthy();
  });

  it('renders download count metadata', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(screen.getByText('2 downloads')).toBeTruthy();
  });

  it('renders report type metadata', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(screen.getByText('summary')).toBeTruthy();
  });

  it('calls onClose when back arrow is clicked', () => {
    const onClose = vi.fn();
    render(<ReportViewer report={mockReport} onClose={onClose} />);
    const backButton = document.querySelector('button');
    if (backButton) fireEvent.click(backButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls updateReportViews on mount', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(financialReportsService.updateReportViews).toHaveBeenCalledWith('report-1');
  });

  it('renders PDF notice when pdf_url is present', () => {
    render(<ReportViewer report={mockReport} onClose={vi.fn()} />);
    expect(screen.getByText('Complete Report Available')).toBeTruthy();
  });

  it('renders without Download PDF button when no pdf_url', () => {
    const reportWithoutPdf = { ...mockReport, pdf_url: undefined };
    render(<ReportViewer report={reportWithoutPdf as GeneratedReport} onClose={vi.fn()} />);
    expect(screen.queryByText('Download PDF')).toBeNull();
  });
});
