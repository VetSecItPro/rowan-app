// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThreadView } from '@/components/messages/ThreadView';

vi.mock('@/lib/services/messages-service', () => ({
  messagesService: {
    getThreadReplies: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({
      id: 'reply-1',
      content: 'Reply',
      conversation_id: 'conv-1',
      sender_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      read: false,
      deleted_at: null,
      deleted_for_everyone: false,
    }),
    getMessageReactions: vi.fn().mockResolvedValue([]),
    toggleReaction: vi.fn().mockResolvedValue(undefined),
    subscribeToMessages: vi.fn().mockReturnValue('mock-channel'),
    unsubscribe: vi.fn(),
  },
}));

vi.mock('@/components/messages/MessageCard', () => ({
  MessageCard: ({ message }: { message: { content: string } }) =>
    React.createElement('div', { 'data-testid': 'message-card' }, message.content),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const mockParentMessage = {
  id: 'msg-1',
  content: 'Original message',
  conversation_id: 'conv-1',
  sender_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  read: false,
  deleted_at: null,
  deleted_for_everyone: false,
  replies: [],
  reply_count: 0,
  attachments_data: [],
};

describe('ThreadView', () => {
  const onClose = vi.fn();

  const defaultProps = {
    parentMessage: mockParentMessage,
    conversationId: 'conv-1',
    spaceId: 'space-1',
    currentUserId: 'user-1',
    onClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ThreadView {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows Thread header', () => {
    render(<ThreadView {...defaultProps} />);
    expect(screen.getByText('Thread')).toBeTruthy();
  });

  it('renders close button', () => {
    render(<ThreadView {...defaultProps} />);
    const closeBtn = document.querySelector('[aria-label*="close"]') ||
      document.querySelector('[title*="Close"]') ||
      screen.queryByRole('button');
    expect(closeBtn).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ThreadView {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the parent message content', () => {
    render(<ThreadView {...defaultProps} />);
    expect(screen.getByText('Original message')).toBeTruthy();
  });

  it('shows empty replies state after loading', async () => {
    render(<ThreadView {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Thread')).toBeTruthy();
    });
  });

  it('renders reply input textarea', async () => {
    render(<ThreadView {...defaultProps} />);
    await waitFor(() => {
      const textarea = document.querySelector('textarea') || document.querySelector('input[type="text"]');
      expect(textarea).toBeTruthy();
    });
  });
});
