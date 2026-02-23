// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/chat/MarkdownMessage', () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="markdown-message">{content}</div>
  ),
}));

vi.mock('@/components/chat/TypingIndicator', () => ({
  default: () => <div data-testid="typing-indicator">Typing...</div>,
}));

import ChatMessage from '@/components/chat/ChatMessage';

const makeMessage = (overrides = {}) => ({
  id: 'msg-1',
  role: 'user' as const,
  content: 'Hello world',
  isStreaming: false,
  feedback: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('ChatMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing for user message', () => {
    render(<ChatMessage message={makeMessage()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders without crashing for assistant message', () => {
    render(<ChatMessage message={makeMessage({ role: 'assistant' })} />);
    expect(screen.getByTestId('markdown-message')).toBeInTheDocument();
  });

  it('renders user message content directly', () => {
    render(<ChatMessage message={makeMessage({ content: 'User says hi' })} />);
    expect(screen.getByText('User says hi')).toBeInTheDocument();
  });

  it('renders assistant message through MarkdownMessage', () => {
    render(
      <ChatMessage
        message={makeMessage({ role: 'assistant', content: 'AI response here' })}
      />
    );
    expect(screen.getByTestId('markdown-message')).toHaveTextContent('AI response here');
  });

  it('shows typing indicator when streaming with no content', () => {
    render(
      <ChatMessage
        message={makeMessage({ role: 'assistant', content: '', isStreaming: true })}
      />
    );
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('does not show typing indicator for user messages', () => {
    render(
      <ChatMessage message={makeMessage({ role: 'user', isStreaming: true })} />
    );
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
  });

  it('shows result badge when message has a successful result', () => {
    render(
      <ChatMessage
        message={makeMessage({
          role: 'assistant',
          result: { success: true, message: 'Task created' },
        })}
      />
    );
    expect(screen.getByText('Done:')).toBeInTheDocument();
    expect(screen.getByText('Task created')).toBeInTheDocument();
  });

  it('shows failed result badge when result failed', () => {
    render(
      <ChatMessage
        message={makeMessage({
          role: 'assistant',
          result: { success: false, message: 'Error occurred' },
        })}
      />
    );
    expect(screen.getByText('Failed:')).toBeInTheDocument();
  });

  it('shows feedback buttons for completed assistant messages', () => {
    render(
      <ChatMessage
        message={makeMessage({ role: 'assistant', content: 'Response', isStreaming: false })}
        onFeedback={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Helpful')).toBeInTheDocument();
    expect(screen.getByLabelText('Not helpful')).toBeInTheDocument();
  });

  it('does not show feedback buttons for user messages', () => {
    render(
      <ChatMessage
        message={makeMessage({ role: 'user', content: 'Question' })}
        onFeedback={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('Helpful')).not.toBeInTheDocument();
  });

  it('does not show feedback buttons while streaming', () => {
    render(
      <ChatMessage
        message={makeMessage({ role: 'assistant', content: 'Streaming...', isStreaming: true })}
        onFeedback={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('Helpful')).not.toBeInTheDocument();
  });

  it('calls onFeedback when positive feedback button clicked', () => {
    const onFeedback = vi.fn();
    render(
      <ChatMessage
        message={makeMessage({ role: 'assistant', content: 'Response', isStreaming: false })}
        onFeedback={onFeedback}
      />
    );
    fireEvent.click(screen.getByLabelText('Helpful'));
    expect(onFeedback).toHaveBeenCalledWith('msg-1', 'positive');
  });

  it('calls onFeedback when negative feedback button clicked', () => {
    const onFeedback = vi.fn();
    render(
      <ChatMessage
        message={makeMessage({ role: 'assistant', content: 'Response', isStreaming: false })}
        onFeedback={onFeedback}
      />
    );
    fireEvent.click(screen.getByLabelText('Not helpful'));
    expect(onFeedback).toHaveBeenCalledWith('msg-1', 'negative');
  });
});
