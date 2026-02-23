// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseChat = vi.fn(() => ({
  messages: [],
  conversationId: 'conv-1',
  isLoading: false,
  isStreaming: false,
  error: null,
  sendMessage: vi.fn(),
  clearChat: vi.fn(),
  stopStreaming: vi.fn(),
  clearError: vi.fn(),
}));

vi.mock('@/lib/hooks/useChat', () => ({
  useChat: (...args: unknown[]) => mockUseChat(...args),
}));

vi.mock('@/lib/hooks/useAISuggestions', () => ({
  useAISuggestions: vi.fn(() => ({
    suggestions: [],
    dismiss: vi.fn(),
  })),
}));

vi.mock('@/lib/hooks/useAIBriefing', () => ({
  useAIBriefing: vi.fn(() => ({
    briefing: null,
    dismiss: vi.fn(),
  })),
}));

vi.mock('@/lib/hooks/useVoiceInput', () => ({
  useVoiceInput: vi.fn(() => ({
    isSupported: false,
    isListening: false,
    transcript: '',
    error: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
  })),
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

import ChatPanel from '@/components/chat/ChatPanel';

const defaultProps = {
  spaceId: 'space-1',
  isOpen: true,
  onClose: vi.fn(),
};

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.mockReturnValue({
      messages: [],
      conversationId: 'conv-1',
      isLoading: false,
      isStreaming: false,
      error: null,
      sendMessage: vi.fn(),
      clearChat: vi.fn(),
      stopStreaming: vi.fn(),
      clearError: vi.fn(),
    });
  });

  it('renders without crashing in overlay mode when open', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Rowan AI')).toBeInTheDocument();
  });

  it('renders in persistent mode', () => {
    render(<ChatPanel {...defaultProps} persistent={true} />);
    expect(screen.getByText('Rowan AI')).toBeInTheDocument();
  });

  it('does not render when closed in overlay mode', () => {
    const { container } = render(<ChatPanel {...defaultProps} isOpen={false} />);
    expect(container.querySelector('[data-testid="chat-panel"]')).toBeNull();
    expect(screen.queryByText('Rowan AI')).not.toBeInTheDocument();
  });

  it('shows new conversation button', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByLabelText('New conversation')).toBeInTheDocument();
  });

  it('shows close button in overlay mode', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByLabelText('Close chat')).toBeInTheDocument();
  });

  it('does not show close button in persistent mode', () => {
    render(<ChatPanel {...defaultProps} persistent={true} />);
    expect(screen.queryByLabelText('Close chat')).not.toBeInTheDocument();
  });

  it('renders the chat input', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask Rowan anything...')).toBeInTheDocument();
  });

  it('renders empty state when there are no messages', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask Rowan anything...')).toBeInTheDocument();
  });

  it('renders messages when available', () => {
    mockUseChat.mockReturnValueOnce({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello', isStreaming: false, feedback: null },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!', isStreaming: false, feedback: null },
      ],
      conversationId: 'conv-1',
      isLoading: false,
      isStreaming: false,
      error: null,
      sendMessage: vi.fn(),
      clearChat: vi.fn(),
      stopStreaming: vi.fn(),
      clearError: vi.fn(),
    });

    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows error banner when there is an error', () => {
    mockUseChat.mockReturnValueOnce({
      messages: [],
      conversationId: 'conv-1',
      isLoading: false,
      isStreaming: false,
      error: 'Something went wrong',
      sendMessage: vi.fn(),
      clearChat: vi.fn(),
      stopStreaming: vi.fn(),
      clearError: vi.fn(),
    });

    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
