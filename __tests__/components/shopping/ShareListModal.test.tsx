// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/share', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
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

import { ShareListModal } from '@/components/shopping/ShareListModal';

const mockList = {
  id: 'list-1',
  title: 'Weekly Groceries',
  store_name: 'Target',
  status: 'active' as const,
  space_id: 'space-1',
  created_at: '2026-01-01',
  is_public: false,
  items: [],
};

describe('ShareListModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    list: mockList,
    onUpdateSharing: vi.fn().mockResolvedValue({ ...mockList, is_public: true, share_token: 'abc123' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when list is null', () => {
    const { container } = render(<ShareListModal {...defaultProps} list={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when open with list', () => {
    const { container } = render(<ShareListModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<ShareListModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Share Shopping List title', () => {
    render(<ShareListModal {...defaultProps} />);
    expect(screen.getByText('Share Shopping List')).toBeTruthy();
  });

  it('shows list title', () => {
    render(<ShareListModal {...defaultProps} />);
    expect(screen.getByText('Weekly Groceries')).toBeTruthy();
  });

  it('shows Private List label when not public', () => {
    render(<ShareListModal {...defaultProps} />);
    expect(screen.getByText('Private List')).toBeTruthy();
  });

  it('shows store info', () => {
    render(<ShareListModal {...defaultProps} />);
    expect(screen.getByText(/No store set|Target/)).toBeTruthy();
  });

  it('shows Close button', () => {
    render(<ShareListModal {...defaultProps} />);
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn();
    render(<ShareListModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows privacy notice text', () => {
    render(<ShareListModal {...defaultProps} />);
    expect(screen.getByText(/Private lists/)).toBeTruthy();
  });

  it('shows toggle button for public/private', () => {
    render(<ShareListModal {...defaultProps} />);
    const toggleBtn = screen.getByRole('button', { name: /Make public/ });
    expect(toggleBtn).toBeTruthy();
  });

  it('shows item count', () => {
    render(<ShareListModal {...defaultProps} />);
    expect(screen.getByText(/0 items/)).toBeTruthy();
  });
});
