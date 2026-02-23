// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/services/audit-log-service', () => ({
  logDataExport: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showInfo: vi.fn(),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
        {footer}
      </div>
    ) : null,
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: vi.fn().mockResolvedValue(new Blob()),
  json: vi.fn().mockResolvedValue({ files: [] }),
});

import { ExportDataModal } from '@/components/settings/ExportDataModal';

describe('ExportDataModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset URL mocks
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<ExportDataModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<ExportDataModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Export Your Data title', () => {
    render(<ExportDataModal {...defaultProps} />);
    expect(screen.getByText('Export Your Data')).toBeTruthy();
  });

  it('renders JSON format option', () => {
    render(<ExportDataModal {...defaultProps} />);
    expect(screen.getByText('JSON')).toBeTruthy();
  });

  it('renders CSV format option', () => {
    render(<ExportDataModal {...defaultProps} />);
    expect(screen.getByText('CSV')).toBeTruthy();
  });

  it('renders PDF format option', () => {
    render(<ExportDataModal {...defaultProps} />);
    expect(screen.getByText('PDF')).toBeTruthy();
  });

  it('renders Export Data button', () => {
    render(<ExportDataModal {...defaultProps} />);
    expect(screen.getByText('Export Data')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<ExportDataModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ExportDataModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('displays GDPR Compliance section', () => {
    render(<ExportDataModal {...defaultProps} />);
    expect(screen.getByText('GDPR Compliance')).toBeTruthy();
  });

  it('shows data type selector when CSV is selected', () => {
    render(<ExportDataModal {...defaultProps} />);
    fireEvent.click(screen.getByText('CSV'));
    expect(screen.getByText('Select Data Type')).toBeTruthy();
  });
});
