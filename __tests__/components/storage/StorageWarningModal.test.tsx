// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

import { useRouter } from 'next/navigation';
import { StorageWarningModal } from '@/components/storage/StorageWarningModal';

describe('StorageWarningModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    warningType: 'warning_80' as const,
    message: 'You are using 80% of your storage.',
    percentageUsed: 80,
    onDismiss: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it('renders when open', () => {
    const { container } = render(<StorageWarningModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<StorageWarningModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows Storage Running Low title for 80% usage', () => {
    render(<StorageWarningModal {...defaultProps} />);
    expect(screen.getByText('Storage Running Low')).toBeTruthy();
  });

  it('shows Storage Almost Full title for 90% usage', () => {
    render(<StorageWarningModal {...defaultProps} percentageUsed={90} />);
    expect(screen.getByText('Storage Almost Full')).toBeTruthy();
  });

  it('shows Storage Full title for 100% usage', () => {
    render(<StorageWarningModal {...defaultProps} percentageUsed={100} />);
    expect(screen.getByText('Storage Full')).toBeTruthy();
  });

  it('displays the warning message', () => {
    render(<StorageWarningModal {...defaultProps} />);
    expect(screen.getByText('You are using 80% of your storage.')).toBeTruthy();
  });

  it('shows storage percentage used', () => {
    render(<StorageWarningModal {...defaultProps} />);
    expect(screen.getByText('80%')).toBeTruthy();
  });

  it('shows Storage Used label', () => {
    render(<StorageWarningModal {...defaultProps} />);
    expect(screen.getByText('Storage Used')).toBeTruthy();
  });

  it('shows Dismiss button', () => {
    render(<StorageWarningModal {...defaultProps} />);
    expect(screen.getByText('Dismiss')).toBeTruthy();
  });

  it('shows Manage Storage button', () => {
    render(<StorageWarningModal {...defaultProps} />);
    expect(screen.getByText('Manage Storage')).toBeTruthy();
  });

  it('calls onDismiss when Dismiss is clicked', async () => {
    const onDismiss = vi.fn().mockResolvedValue(undefined);
    render(<StorageWarningModal {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('navigates to settings when Manage Storage is clicked', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as ReturnType<typeof useRouter>);

    render(<StorageWarningModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Manage Storage'));
    expect(mockPush).toHaveBeenCalledWith('/settings/data');
  });

  it('shows help text about managing files', () => {
    render(<StorageWarningModal {...defaultProps} />);
    expect(screen.getByText(/manage your files and free up space/)).toBeTruthy();
  });
});
