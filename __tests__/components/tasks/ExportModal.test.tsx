// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

vi.mock('@/lib/services/task-export-service', () => ({
  taskExportService: {
    exportToCSV: vi.fn().mockResolvedValue('csv,data'),
    downloadCSV: vi.fn(),
  },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
    footer?: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ExportModal } from '@/components/tasks/ExportModal';

describe('ExportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeDefined();
  });

  it('renders modal title', () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByText('Export Tasks')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    render(<ExportModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows CSV export format option', () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByText('CSV (Comma Separated Values)')).toBeDefined();
  });

  it('shows column selection section', () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByText('Select Columns to Export')).toBeDefined();
  });

  it('shows Export CSV button', () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByText('Export CSV')).toBeDefined();
  });

  it('shows Cancel button', () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('shows required columns like Title and Status', () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
  });
});
