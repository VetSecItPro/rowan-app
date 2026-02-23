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
    json: vi.fn().mockResolvedValue({ success: true, data: { id: 'space-1', name: 'New Space' } }),
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
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
        {footer}
      </div>
    ) : null,
}));

import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';

describe('CreateSpaceModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSpaceCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    const { container } = render(<CreateSpaceModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<CreateSpaceModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Create New Space title', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    expect(screen.getByText('Create New Space')).toBeTruthy();
  });

  it('shows Space Name label', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    expect(screen.getByText('Space Name *')).toBeTruthy();
  });

  it('shows helpful description text', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    expect(screen.getByText(/shared space where you'll manage tasks/)).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Create Space button', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    expect(screen.getByText('Create Space')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<CreateSpaceModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows space name placeholder text', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("e.g., Our Family, The Johnsons, Home Sweet Home")).toBeTruthy();
  });

  it('space name input starts empty', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("e.g., Our Family, The Johnsons, Home Sweet Home") as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('updates space name on input change', () => {
    render(<CreateSpaceModal {...defaultProps} />);
    const input = screen.getByPlaceholderText("e.g., Our Family, The Johnsons, Home Sweet Home") as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Johnson Family' } });
    expect(input.value).toBe('Johnson Family');
  });
});
