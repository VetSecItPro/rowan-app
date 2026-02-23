// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ success: true }),
    blob: vi.fn().mockResolvedValue(new Blob()),
    headers: {
      get: vi.fn(() => null),
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; subtitle?: string; footer?: React.ReactNode }) =>
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
  json: vi.fn().mockResolvedValue({ success: true, data: { tasks: 5, events: 3, total: 8 } }),
});

global.URL.createObjectURL = vi.fn(() => 'blob:url');
global.URL.revokeObjectURL = vi.fn();

import { DeleteSpaceModal } from '@/components/spaces/DeleteSpaceModal';

const mockSpace = { id: 'space-1', name: 'Johnson Family' };

describe('DeleteSpaceModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    space: mockSpace,
    onSpaceDeleted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    const { container } = render(<DeleteSpaceModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<DeleteSpaceModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Delete Space title', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    expect(screen.getByText('Delete Space')).toBeTruthy();
  });

  it('shows Permanent Deletion Warning on first step', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    expect(screen.getByText('Permanent Deletion Warning')).toBeTruthy();
  });

  it('shows space name in warning', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    expect(screen.getByText(/Johnson Family/)).toBeTruthy();
  });

  it('shows Cancel button on warning step', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Export & Delete button on warning step', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    expect(screen.getByText('Export & Delete')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<DeleteSpaceModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows list of data to be deleted', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    expect(screen.getByText(/All tasks and to-do lists/)).toBeTruthy();
    expect(screen.getByText(/Calendar events and reminders/)).toBeTruthy();
  });

  it('shows export recommendation section', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    expect(screen.getByText('Recommended: Export Your Data First')).toBeTruthy();
  });

  it('shows cannot be undone warning', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    expect(screen.getByText(/This action cannot be undone/)).toBeTruthy();
  });

  it('navigates to export step when Export & Delete is clicked', () => {
    render(<DeleteSpaceModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Export & Delete'));
    expect(screen.getByText('Export Space Data')).toBeTruthy();
  });
});
