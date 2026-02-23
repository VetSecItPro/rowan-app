// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/services/export-service', () => ({
  exportService: {
    exportMonthlyExpenses: vi.fn(),
    exportYearlyExpenses: vi.fn(),
    exportExpenses: vi.fn(),
    exportCategoryBreakdown: vi.fn(),
  },
}));

vi.mock('@/lib/services/pdf-export-service', () => ({
  pdfExportService: {
    exportMonthlyExpenseSummary: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showWarning: vi.fn(),
  showSuccess: vi.fn(),
}));

import ExportButton from '@/components/expenses/ExportButton';

describe('ExportButton', () => {
  it('renders without crashing', () => {
    render(<ExportButton spaceId="space-1" />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('does not show modal by default', () => {
    render(<ExportButton spaceId="space-1" />);
    expect(screen.queryByText('Export Expenses')).not.toBeInTheDocument();
  });

  it('opens modal when export button is clicked', () => {
    render(<ExportButton spaceId="space-1" />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('Export Expenses')).toBeInTheDocument();
  });

  it('shows export format options in modal', () => {
    render(<ExportButton spaceId="space-1" />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('shows export period options in modal', () => {
    render(<ExportButton spaceId="space-1" />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('Full Year')).toBeInTheDocument();
    expect(screen.getByText('Custom Range')).toBeInTheDocument();
    expect(screen.getByText('By Category')).toBeInTheDocument();
  });

  it('closes modal when Cancel is clicked', () => {
    render(<ExportButton spaceId="space-1" />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('Export Expenses')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Export Expenses')).not.toBeInTheDocument();
  });

  it('renders close button in modal header', () => {
    render(<ExportButton spaceId="space-1" />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    render(<ExportButton spaceId="space-1" />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByText('Export Expenses')).not.toBeInTheDocument();
  });
});
