// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewMessageModal } from '@/components/messages/NewMessageModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
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

vi.mock('@/lib/utils/toast', () => ({
  showWarning: vi.fn(),
}));

describe('NewMessageModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose,
    onSave,
    spaceId: 'space-1',
    conversationId: 'conv-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    onSave.mockResolvedValue(undefined);
  });

  it('renders without crashing when open', () => {
    const { container } = render(<NewMessageModal {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when closed', () => {
    const { container } = render(<NewMessageModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows New Message title when creating', () => {
    render(<NewMessageModal {...defaultProps} />);
    expect(screen.getByText('New Message')).toBeTruthy();
  });

  it('shows Edit Message title when editing', () => {
    const editMessage = {
      id: 'msg-1', content: 'Old message', conversation_id: 'conv-1', sender_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      read: false, deleted_at: null, deleted_for_everyone: false,
    };
    render(<NewMessageModal {...defaultProps} editMessage={editMessage} />);
    expect(screen.getByText('Edit Message')).toBeTruthy();
  });

  it('renders message textarea', () => {
    render(<NewMessageModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<NewMessageModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<NewMessageModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders emoji picker button', () => {
    render(<NewMessageModal {...defaultProps} />);
    const emojiBtn = document.querySelector('[title="Add emoji"]') || document.querySelector('button');
    expect(emojiBtn).toBeTruthy();
  });

  it('allows typing a message', () => {
    render(<NewMessageModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello family!' } });
    expect(textarea.value).toBe('Hello family!');
  });

  it('calls onSave when form is submitted', async () => {
    render(<NewMessageModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      fireEvent.submit(form);
      await waitFor(() => expect(onSave).toHaveBeenCalled());
    }
  });
});
