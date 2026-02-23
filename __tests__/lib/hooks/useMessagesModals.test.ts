/**
 * Unit tests for lib/hooks/useMessagesModals.ts
 *
 * Tests message edit/delete/thread/forward modal state management.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessagesModals } from '@/lib/hooks/useMessagesModals';
import type { Message } from '@/lib/services/messages-service';

const mockMessage = { id: 'msg-1', content: 'Hello' } as Message;

describe('useMessagesModals', () => {
  it('should initialize all modals as closed', () => {
    const { result } = renderHook(() => useMessagesModals());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingMessage).toBeNull();
    expect(result.current.confirmDialog).toEqual({ isOpen: false, messageId: '', isOwnMessage: false });
    expect(result.current.selectedThread).toBeNull();
    expect(result.current.showEmojiPicker).toBe(false);
    expect(result.current.showVoiceRecorder).toBe(false);
    expect(result.current.showNewConversationModal).toBe(false);
    expect(result.current.showConversationSidebar).toBe(false);
    expect(result.current.showForwardModal).toBe(false);
    expect(result.current.forwardingMessage).toBeNull();
    expect(result.current.editingConversationTitle).toBe(false);
    expect(result.current.conversationTitleInput).toBe('');
    expect(result.current.showMembersPanel).toBe(false);
  });

  it('openEditModal should set editing message and open modal', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openEditModal(mockMessage));

    expect(result.current.editingMessage).toEqual(mockMessage);
    expect(result.current.isModalOpen).toBe(true);
  });

  it('closeEditModal should close modal and clear editing message', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openEditModal(mockMessage));
    act(() => result.current.closeEditModal());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingMessage).toBeNull();
  });

  it('openDeleteConfirm should open confirm dialog with correct data', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openDeleteConfirm('msg-123', true));

    expect(result.current.confirmDialog).toEqual({
      isOpen: true,
      messageId: 'msg-123',
      isOwnMessage: true,
    });
  });

  it('closeDeleteConfirm should reset confirm dialog', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openDeleteConfirm('msg-123', false));
    act(() => result.current.closeDeleteConfirm());

    expect(result.current.confirmDialog).toEqual({
      isOpen: false,
      messageId: '',
      isOwnMessage: false,
    });
  });

  it('openThread should set selected thread', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openThread(mockMessage));

    expect(result.current.selectedThread).toEqual(mockMessage);
  });

  it('closeThread should clear selected thread', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openThread(mockMessage));
    act(() => result.current.closeThread());

    expect(result.current.selectedThread).toBeNull();
  });

  it('toggleEmojiPicker should toggle emoji picker visibility', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.toggleEmojiPicker());
    expect(result.current.showEmojiPicker).toBe(true);

    act(() => result.current.toggleEmojiPicker());
    expect(result.current.showEmojiPicker).toBe(false);
  });

  it('closeEmojiPicker should close emoji picker', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.toggleEmojiPicker());
    act(() => result.current.closeEmojiPicker());

    expect(result.current.showEmojiPicker).toBe(false);
  });

  it('openNewConversationModal should open new conversation modal', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openNewConversationModal());

    expect(result.current.showNewConversationModal).toBe(true);
  });

  it('closeNewConversationModal should close new conversation modal', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openNewConversationModal());
    act(() => result.current.closeNewConversationModal());

    expect(result.current.showNewConversationModal).toBe(false);
  });

  it('openForwardModal should set forwarding message and open forward modal', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openForwardModal(mockMessage));

    expect(result.current.forwardingMessage).toEqual(mockMessage);
    expect(result.current.showForwardModal).toBe(true);
  });

  it('closeForwardModal should clear forwarding message and close modal', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.openForwardModal(mockMessage));
    act(() => result.current.closeForwardModal());

    expect(result.current.showForwardModal).toBe(false);
    expect(result.current.forwardingMessage).toBeNull();
  });

  it('startEditingTitle should set title input and open editing mode', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.startEditingTitle('My Conversation'));

    expect(result.current.conversationTitleInput).toBe('My Conversation');
    expect(result.current.editingConversationTitle).toBe(true);
  });

  it('cancelEditingTitle should exit editing and clear input', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.startEditingTitle('My Conversation'));
    act(() => result.current.cancelEditingTitle());

    expect(result.current.editingConversationTitle).toBe(false);
    expect(result.current.conversationTitleInput).toBe('');
  });

  it('finishEditingTitle should exit editing mode', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.startEditingTitle('My Conversation'));
    act(() => result.current.finishEditingTitle());

    expect(result.current.editingConversationTitle).toBe(false);
  });

  it('toggleMembersPanel should toggle members panel visibility', () => {
    const { result } = renderHook(() => useMessagesModals());

    act(() => result.current.toggleMembersPanel());
    expect(result.current.showMembersPanel).toBe(true);

    act(() => result.current.toggleMembersPanel());
    expect(result.current.showMembersPanel).toBe(false);
  });
});
