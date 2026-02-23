// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageCard } from '@/components/messages/MessageCard';
import type { MessageWithAttachments } from '@/lib/services/messages-service';

vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn(() => '12:00 PM'),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock('@/lib/services/messages-service', () => ({
  messagesService: {
    getMessageReactions: vi.fn().mockResolvedValue([]),
    toggleReaction: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/components/messages/AttachmentPreview', () => ({
  AttachmentPreview: () => React.createElement('div', { 'data-testid': 'attachment-preview' }),
}));

vi.mock('@/components/messages/ReactionPicker', () => ({
  ReactionPicker: ({ onSelectEmoji }: { onSelectEmoji: (e: string) => void }) =>
    React.createElement('button', { onClick: () => onSelectEmoji('👍'), 'data-testid': 'reaction-picker' }, 'React'),
}));

vi.mock('@/components/messages/MentionHighlight', () => ({
  MentionHighlight: ({ content }: { content: string }) => React.createElement('span', null, content),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const makeMessage = (overrides: Partial<MessageWithAttachments> = {}): MessageWithAttachments => ({
  id: 'msg-1',
  conversation_id: 'conv-1',
  sender_id: 'user-1',
  content: 'Hello world',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  is_pinned: false,
  pinned_at: null,
  read: false,
  deleted_at: null,
  deleted_for_everyone: false,
  attachments_data: [],
  ...overrides,
} as MessageWithAttachments);

describe('MessageCard', () => {
  const defaultProps = {
    message: makeMessage(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onMarkRead: vi.fn(),
    isOwn: false,
  };

  it('renders without crashing', () => {
    const { container } = render(<MessageCard {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('displays message content', () => {
    render(<MessageCard {...defaultProps} message={makeMessage({ content: 'Hello world' })} />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('shows deleted placeholder for deleted messages', () => {
    render(
      <MessageCard
        {...defaultProps}
        message={makeMessage({ deleted_for_everyone: true, content: 'Hidden' })}
      />
    );
    expect(screen.getByText('This message was deleted')).toBeTruthy();
  });

  it('shows timestamp', () => {
    render(<MessageCard {...defaultProps} />);
    expect(screen.getByText('12:00 PM')).toBeTruthy();
  });

  it('shows Read more for long messages', () => {
    const longContent = 'x'.repeat(201);
    render(<MessageCard {...defaultProps} message={makeMessage({ content: longContent })} />);
    expect(screen.getByText('Read more')).toBeTruthy();
  });

  it('expands long message when Read more is clicked', () => {
    const longContent = 'x'.repeat(201);
    render(<MessageCard {...defaultProps} message={makeMessage({ content: longContent })} />);
    fireEvent.click(screen.getByText('Read more'));
    expect(screen.getByText('Show less')).toBeTruthy();
  });

  it('shows edit and delete buttons for own messages', () => {
    render(
      <MessageCard {...defaultProps} isOwn={true} />
    );
    expect(screen.getByLabelText('Edit message')).toBeTruthy();
    expect(screen.getByLabelText('Delete message')).toBeTruthy();
  });

  it('does not show edit/delete buttons for others messages', () => {
    render(<MessageCard {...defaultProps} isOwn={false} />);
    expect(screen.queryByLabelText('Edit message')).toBeNull();
    expect(screen.queryByLabelText('Delete message')).toBeNull();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<MessageCard {...defaultProps} isOwn={true} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Delete message'));
    expect(onDelete).toHaveBeenCalledWith('msg-1');
  });

  it('shows pin button when onTogglePin is provided', () => {
    render(<MessageCard {...defaultProps} onTogglePin={vi.fn()} />);
    expect(screen.getByLabelText('Pin message')).toBeTruthy();
  });

  it('shows forward button when onForward is provided', () => {
    render(<MessageCard {...defaultProps} onForward={vi.fn()} />);
    expect(screen.getByLabelText('Forward message')).toBeTruthy();
  });
});
