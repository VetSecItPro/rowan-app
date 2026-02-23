// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const mockAuth = vi.hoisted(() => ({
  currentSpace: { id: 'space-1', name: 'Test Space' },
  user: { id: 'user-1', email: 'test@example.com' },
}));

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => mockAuth),
}));

vi.mock('@/lib/services/messages-service', () => ({
  messagesService: {
    getConversations: vi.fn().mockResolvedValue([{ id: 'conv-default', title: 'General' }]),
    getMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false, nextCursor: null }),
    getMessageStats: vi.fn().mockResolvedValue({ unread: 0, total: 0, byConversation: [] }),
    getPinnedMessages: vi.fn().mockResolvedValue([]),
    getConversationsList: vi.fn().mockResolvedValue([]),
    createConversation: vi.fn().mockResolvedValue({ id: 'conv-new', title: 'General' }),
    subscribeToMessages: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    unsubscribe: vi.fn(),
    broadcastStopTyping: vi.fn(),
  },
  Message: {},
  Conversation: {},
  TypingIndicator: {},
  MessageStats: {},
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useMessagesData } from '@/lib/hooks/useMessagesData';

describe('useMessagesData', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('should return initial state', async () => {
    const { result } = renderHook(() => useMessagesData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
    expect(result.current.messageInput).toBe('');
    expect(result.current.isSending).toBe(false);
  });

  it('setMessageInput should update message input', async () => {
    const { result } = renderHook(() => useMessagesData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setMessageInput('Hello world'));
    expect(result.current.messageInput).toBe('Hello world');
  });

  it('setConversationId should update conversation id', async () => {
    const { result } = renderHook(() => useMessagesData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setConversationId('conv-123'));
    expect(result.current.conversationId).toBe('conv-123');
  });

  it('should expose loadMessages and scrollToBottom functions', async () => {
    const { result } = renderHook(() => useMessagesData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.loadMessages).toBe('function');
    expect(typeof result.current.scrollToBottom).toBe('function');
  });

  it('should expose getDateLabel helper', async () => {
    const { result } = renderHook(() => useMessagesData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.getDateLabel).toBe('function');
    const label = result.current.getDateLabel(new Date(2026, 1, 22));
    expect(typeof label).toBe('string');
  });

  it('should expose filteredMessages as array', async () => {
    const { result } = renderHook(() => useMessagesData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(Array.isArray(result.current.filteredMessages)).toBe(true);
  });
});
