// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewConversationModal } from '@/components/messages/NewConversationModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

describe('NewConversationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
    spaceId: 'space-1',
  };

  it('renders without crashing when closed', () => {
    const { container } = render(<NewConversationModal {...defaultProps} isOpen={false} />);
    expect(container).toBeTruthy();
  });

  it('renders modal title when open', () => {
    render(<NewConversationModal {...defaultProps} />);
    expect(screen.getByText('New Conversation')).toBeTruthy();
  });

  it('shows conversation type options', () => {
    render(<NewConversationModal {...defaultProps} />);
    expect(screen.getByText('Direct')).toBeTruthy();
    expect(screen.getByText('Group')).toBeTruthy();
    expect(screen.getByText('General')).toBeTruthy();
  });

  it('shows title input', () => {
    render(<NewConversationModal {...defaultProps} />);
    expect(screen.getByLabelText(/conversation title/i)).toBeTruthy();
  });

  it('shows Cancel and Create Conversation buttons', () => {
    render(<NewConversationModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Create Conversation')).toBeTruthy();
  });

  it('Create button is disabled when title is empty', () => {
    render(<NewConversationModal {...defaultProps} />);
    const createBtn = screen.getByText('Create Conversation');
    expect(createBtn.closest('button')?.disabled).toBe(true);
  });

  it('Create button is enabled when title is filled', () => {
    render(<NewConversationModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/conversation title/i), { target: { value: 'Family Chat' } });
    const createBtn = screen.getByText('Create Conversation');
    expect(createBtn.closest('button')?.disabled).toBe(false);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<NewConversationModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows description field when Group is selected', () => {
    render(<NewConversationModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Group'));
    expect(screen.getByText(/description/i)).toBeTruthy();
  });

  it('selects different conversation types', () => {
    render(<NewConversationModal {...defaultProps} />);
    fireEvent.click(screen.getByText('General'));
    expect(screen.getByText(/space-wide announcements/i)).toBeTruthy();
  });
});
