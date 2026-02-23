/**
 * Unit tests for lib/hooks/useMessagesHandlers.ts
 *
 * Tests handler function existence and basic behavior.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessagesHandlers } from '@/lib/hooks/useMessagesHandlers';
import type { MessagesHandlersDeps } from '@/lib/hooks/useMessagesHandlers';

vi.mock('@/lib/services/messages-service', () => ({
  messagesService: {
    createMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    updateMessage: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    togglePin: vi.fn().mockResolvedValue(undefined),
    unpinMessage: vi.fn().mockResolvedValue(undefined),
    createConversation: vi.fn().mockResolvedValue({ id: 'conv-1' }),
    updateConversation: vi.fn().mockResolvedValue(undefined),
    forwardMessage: vi.fn().mockResolvedValue(undefined),
  },
  Message: {},
  MessageWithReplies: {},
  CreateMessageInput: {},
  CreateConversationInput: {},
  DeleteMessageMode: {},
}));

vi.mock('@/lib/services/mentions-service', () => ({
  mentionsService: {
    createMentions: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/file-upload-service', () => ({
  fileUploadService: {
    uploadFile: vi.fn().mockResolvedValue({ url: 'https://example.com/file.jpg' }),
  },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function buildDeps(overrides: Partial<MessagesHandlersDeps> = {}): MessagesHandlersDeps {
  return {
    user: { id: 'user-1', email: 'test@example.com' },
    currentSpace: { id: 'space-1' },
    messages: [],
    setMessages: vi.fn(),
    setStats: vi.fn(),
    conversations: [],
    setConversations: vi.fn(),
    conversationId: null,
    setConversationId: vi.fn(),
    conversationTitle: '',
    messageInput: '',
    setMessageInput: vi.fn(),
    isSending: false,
    setIsSending: vi.fn(),
    pinnedMessages: [],
    setPinnedMessages: vi.fn(),
    typingTimeoutRef: { current: null },
    channelRef: { current: null },
    fileInputRef: { current: null },
    scrollToBottom: vi.fn(),
    loadMessages: vi.fn().mockResolvedValue(undefined),
    setHasMore: vi.fn(),
    nextCursorRef: { current: null },
    editingMessage: null,
    confirmDialog: { isOpen: false, messageId: '', isOwnMessage: false },
    forwardingMessage: null,
    conversationTitleInput: '',
    closeEditModal: vi.fn(),
    openDeleteConfirm: vi.fn(),
    closeDeleteConfirm: vi.fn(),
    closeEmojiPicker: vi.fn(),
    setShowVoiceRecorder: vi.fn(),
    closeNewConversationModal: vi.fn(),
    setShowConversationSidebar: vi.fn(),
    closeForwardModal: vi.fn(),
    finishEditingTitle: vi.fn(),
    cancelEditingTitle: vi.fn(),
    openEditModal: vi.fn(),
    openThread: vi.fn(),
    openForwardModal: vi.fn(),
    startEditingTitle: vi.fn(),
    ...overrides,
  };
}

describe('useMessagesHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all expected handler functions', () => {
    const { result } = renderHook(() => useMessagesHandlers(buildDeps()));

    expect(typeof result.current.handleCreateMessage).toBe('function');
    expect(typeof result.current.handleDeleteMessage).toBe('function');
    expect(typeof result.current.handleConfirmDelete).toBe('function');
    expect(typeof result.current.handleTogglePin).toBe('function');
    expect(typeof result.current.handleEditMessage).toBe('function');
    expect(typeof result.current.handleCloseModal).toBe('function');
    expect(typeof result.current.handleSubmitMessage).toBe('function');
    expect(typeof result.current.handleEmojiClick).toBe('function');
    expect(typeof result.current.handleMessageInputChange).toBe('function');
    expect(typeof result.current.handleFileClick).toBe('function');
  });

  it('handleEditMessage should call openEditModal with message', () => {
    const openEditModal = vi.fn();
    const { result } = renderHook(() =>
      useMessagesHandlers(buildDeps({ openEditModal }))
    );

    const msg = { id: 'msg-1', content: 'Hello' } as Parameters<typeof result.current.handleEditMessage>[0];
    act(() => result.current.handleEditMessage(msg));

    expect(openEditModal).toHaveBeenCalledWith(msg);
  });

  it('handleCloseModal should call closeEditModal', () => {
    const closeEditModal = vi.fn();
    const { result } = renderHook(() =>
      useMessagesHandlers(buildDeps({ closeEditModal }))
    );

    act(() => result.current.handleCloseModal());

    expect(closeEditModal).toHaveBeenCalledTimes(1);
  });

  it('handleMessageInputChange should call setMessageInput', () => {
    const setMessageInput = vi.fn();
    const { result } = renderHook(() =>
      useMessagesHandlers(buildDeps({ setMessageInput }))
    );

    act(() => result.current.handleMessageInputChange('Hello world'));

    expect(setMessageInput).toHaveBeenCalledWith('Hello world');
  });

  it('handleEmojiClick should append emoji to message input', () => {
    const setMessageInput = vi.fn();
    const deps = buildDeps({ messageInput: 'Hi ', setMessageInput });
    const { result } = renderHook(() => useMessagesHandlers(deps));

    act(() => result.current.handleEmojiClick('😊'));

    // setMessageInput is called with an updater function (prev => prev + emoji)
    expect(setMessageInput).toHaveBeenCalledWith(expect.any(Function));
    const updater = setMessageInput.mock.calls[0][0];
    expect(updater('Hi ')).toBe('Hi 😊');
  });
});
