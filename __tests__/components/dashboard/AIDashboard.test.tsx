// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
       
      const { initial, animate, exit, variants, transition, whileInView, viewport, ...rest } = props as Record<string, unknown>;
      return React.createElement(tag as string, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/contexts/chat-context', () => ({
  useChatContext: vi.fn(() => ({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    sendMessage: vi.fn(),
    stopStreaming: vi.fn(),
    clearError: vi.fn(),
    suggestions: [],
    dismissSuggestion: vi.fn(),
    briefing: null,
    dismissBriefing: vi.fn(),
    voiceEnabled: false,
    conversationId: 'conv-1',
  })),
}));

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    user: { id: 'user-1', name: 'John Smith' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
  })),
}));

vi.mock('@/components/chat/ChatMessage', () => ({
  default: ({ message }: { message: { id: string; content: string } }) =>
    React.createElement('div', { 'data-testid': `msg-${message.id}` }, message.content),
}));

vi.mock('@/components/chat/ChatInput', () => ({
  default: ({ placeholder }: { placeholder?: string }) =>
    React.createElement('input', { 'data-testid': 'chat-input', placeholder }),
}));

vi.mock('@/components/chat/QuickActions', () => ({
  default: ({ onSend }: { onSend: (msg: string) => void }) =>
    React.createElement('button', { onClick: () => onSend('quick action'), 'data-testid': 'quick-actions' }, 'Quick Actions'),
}));

vi.mock('@/components/chat/MorningBriefing', () => ({
  default: () => React.createElement('div', { 'data-testid': 'morning-briefing' }),
}));

vi.mock('@/components/chat/SuggestionCards', () => ({
  default: () => React.createElement('div', { 'data-testid': 'suggestion-cards' }),
}));

import { AIDashboard } from '@/components/dashboard/AIDashboard';
import { useChatContext } from '@/lib/contexts/chat-context';

const mockUseChatContext = vi.mocked(useChatContext);

const defaultContext = {
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  sendMessage: vi.fn(),
  stopStreaming: vi.fn(),
  clearError: vi.fn(),
  suggestions: [],
  dismissSuggestion: vi.fn(),
  briefing: null,
  dismissBriefing: vi.fn(),
  voiceEnabled: false,
  conversationId: 'conv-1',
};

const defaultProps = {
  onSwitchToTraditional: vi.fn(),
};

describe('AIDashboard', () => {
  it('renders without crashing', () => {
    const { container } = render(<AIDashboard {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows greeting text', () => {
    render(<AIDashboard {...defaultProps} />);
    expect(screen.getByText(/Good (morning|afternoon|evening), John/)).toBeTruthy();
  });

  it('shows Classic View toggle button', () => {
    render(<AIDashboard {...defaultProps} />);
    expect(screen.getByText(/Classic View/)).toBeTruthy();
  });

  it('calls onSwitchToTraditional when Classic View clicked', () => {
    const onSwitch = vi.fn();
    render(<AIDashboard onSwitchToTraditional={onSwitch} />);
    fireEvent.click(screen.getByText(/Classic View/));
    expect(onSwitch).toHaveBeenCalled();
  });

  it('shows empty state when no messages', () => {
    render(<AIDashboard {...defaultProps} />);
    expect(screen.getByText('What can I help with today?')).toBeTruthy();
  });

  it('renders chat input', () => {
    render(<AIDashboard {...defaultProps} />);
    expect(screen.getByTestId('chat-input')).toBeTruthy();
  });

  it('renders quick actions when no messages', () => {
    render(<AIDashboard {...defaultProps} />);
    expect(screen.getByTestId('quick-actions')).toBeTruthy();
  });

  it('shows chat messages when messages exist', () => {
    mockUseChatContext.mockReturnValueOnce({
      ...defaultContext,
      messages: [{ id: 'msg-1', role: 'user' as const, content: 'Hello', timestamp: new Date() }],
    });
    render(<AIDashboard {...defaultProps} />);
    expect(screen.getByTestId('msg-msg-1')).toBeTruthy();
  });

  it('shows error banner when error exists', () => {
    mockUseChatContext.mockReturnValueOnce({
      ...defaultContext,
      error: 'Something went wrong',
    });
    render(<AIDashboard {...defaultProps} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('shows morning briefing when briefing exists', () => {
    mockUseChatContext.mockReturnValueOnce({
      ...defaultContext,
      briefing: { greeting: 'Good morning!', sections: [] },
    });
    render(<AIDashboard {...defaultProps} />);
    expect(screen.getByTestId('morning-briefing')).toBeTruthy();
  });
});
