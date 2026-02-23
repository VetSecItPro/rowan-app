// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PinnedMessages } from '@/components/messages/PinnedMessages';
import type { MessageWithAttachments } from '@/lib/services/messages-service';

vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn(() => 'Jan 1, 2026'),
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
  content: 'Important announcement!',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  is_pinned: true,
  pinned_at: '2026-01-01T00:00:00Z',
  read: false,
  deleted_at: null,
  deleted_for_everyone: false,
  attachments_data: [],
  ...overrides,
} as MessageWithAttachments);

describe('PinnedMessages', () => {
  it('renders nothing when messages array is empty', () => {
    const { container } = render(
      <PinnedMessages messages={[]} onUnpin={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders pinned message header', () => {
    render(<PinnedMessages messages={[makeMessage()]} onUnpin={vi.fn()} />);
    expect(screen.getByText(/1 pinned message/i)).toBeTruthy();
  });

  it('displays message content', () => {
    render(
      <PinnedMessages messages={[makeMessage({ content: 'Important announcement!' })]} onUnpin={vi.fn()} />
    );
    expect(screen.getByText('Important announcement!')).toBeTruthy();
  });

  it('shows plural label for multiple pinned messages', () => {
    const messages = [makeMessage(), makeMessage({ id: 'msg-2', content: 'Second pin' })];
    render(<PinnedMessages messages={messages} onUnpin={vi.fn()} />);
    expect(screen.getByText(/2 pinned messages/i)).toBeTruthy();
  });

  it('calls onUnpin when unpin button is clicked', () => {
    const onUnpin = vi.fn();
    render(<PinnedMessages messages={[makeMessage()]} onUnpin={onUnpin} />);
    fireEvent.click(screen.getByLabelText(/unpin this message/i));
    expect(onUnpin).toHaveBeenCalledWith('msg-1');
  });

  it('collapses messages when collapse button is clicked', () => {
    render(<PinnedMessages messages={[makeMessage()]} onUnpin={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/collapse pinned messages/i));
    expect(screen.queryByText('Important announcement!')).toBeNull();
  });

  it('expands messages when expand button is clicked after collapse', () => {
    render(<PinnedMessages messages={[makeMessage()]} onUnpin={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/collapse pinned messages/i));
    fireEvent.click(screen.getByLabelText(/expand pinned messages/i));
    expect(screen.getByText('Important announcement!')).toBeTruthy();
  });

  it('calls onMessageClick when message content is clicked', () => {
    const onMessageClick = vi.fn();
    render(
      <PinnedMessages messages={[makeMessage()]} onUnpin={vi.fn()} onMessageClick={onMessageClick} />
    );
    fireEvent.click(screen.getByText('Important announcement!'));
    expect(onMessageClick).toHaveBeenCalledWith('msg-1');
  });
});
