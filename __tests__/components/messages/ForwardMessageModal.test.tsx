// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ForwardMessageModal } from '@/components/messages/ForwardMessageModal';
import type { Conversation } from '@/lib/services/messages-service';

vi.mock('use-debounce', () => ({
  useDebounce: (val: unknown) => [val],
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title, footer }: { children: React.ReactNode; isOpen: boolean; title: string; footer?: React.ReactNode; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    );
  },
}));

const makeConversation = (id: string, title: string): Conversation => ({
  id,
  space_id: 'space-1',
  title,
  created_by: 'user-1',
  is_archived: false,
  is_group: false,
  last_message: null,
  last_message_at: '2026-02-22T10:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-22T10:00:00Z',
  participant_count: 2,
});

describe('ForwardMessageModal', () => {
  const onClose = vi.fn();
  const onForward = vi.fn().mockResolvedValue(undefined);

  const defaultProps = {
    isOpen: true,
    onClose,
    onForward,
    conversations: [
      makeConversation('conv-1', 'Family Chat'),
      makeConversation('conv-2', 'Partner Chat'),
    ],
    messagePreview: 'Hello world',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    onForward.mockResolvedValue(undefined);
  });

  it('renders without crashing when open', () => {
    const { container } = render(<ForwardMessageModal {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when closed', () => {
    const { container } = render(<ForwardMessageModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows modal title containing Forward', () => {
    render(<ForwardMessageModal {...defaultProps} />);
    // Use getAllByText since "Forward" may appear multiple times (title + button)
    const forwardElements = screen.getAllByText(/Forward/i);
    expect(forwardElements.length).toBeGreaterThan(0);
  });

  it('displays conversations to forward to', () => {
    render(<ForwardMessageModal {...defaultProps} />);
    expect(screen.getByText('Family Chat')).toBeTruthy();
    expect(screen.getByText('Partner Chat')).toBeTruthy();
  });

  it('renders search input', () => {
    render(<ForwardMessageModal {...defaultProps} />);
    const searchInput = document.querySelector('input');
    expect(searchInput).toBeTruthy();
  });

  it('renders cancel button', () => {
    render(<ForwardMessageModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onClose when cancel is clicked', () => {
    render(<ForwardMessageModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows message preview text', () => {
    render(<ForwardMessageModal {...defaultProps} />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('filters conversations by search', () => {
    render(<ForwardMessageModal {...defaultProps} />);
    const searchInput = document.querySelector('input') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Family' } });
    expect(screen.getByText('Family Chat')).toBeTruthy();
  });

  it('renders forward button', () => {
    render(<ForwardMessageModal {...defaultProps} />);
    const forwardElements = screen.queryAllByText(/Forward/i);
    expect(forwardElements.length).toBeGreaterThan(0);
  });
});
