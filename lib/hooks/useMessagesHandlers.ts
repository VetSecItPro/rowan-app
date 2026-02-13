import { useCallback } from 'react';
import { messagesService, Message, MessageWithReplies, CreateMessageInput, CreateConversationInput, DeleteMessageMode } from '@/lib/services/messages-service';
import { mentionsService } from '@/lib/services/mentions-service';
import { fileUploadService } from '@/lib/services/file-upload-service';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { MessagesDataReturn } from '@/lib/hooks/useMessagesData';
import type { MessagesModalsReturn } from '@/lib/hooks/useMessagesModals';

// =============================================
// DEPS INTERFACE
// =============================================

export interface MessagesHandlersDeps {
  // From data hook
  user: MessagesDataReturn['user'];
  currentSpace: MessagesDataReturn['currentSpace'];
  messages: MessagesDataReturn['messages'];
  setMessages: MessagesDataReturn['setMessages'];
  setStats: MessagesDataReturn['setStats'];
  conversations: MessagesDataReturn['conversations'];
  setConversations: MessagesDataReturn['setConversations'];
  conversationId: MessagesDataReturn['conversationId'];
  setConversationId: MessagesDataReturn['setConversationId'];
  conversationTitle: MessagesDataReturn['conversationTitle'];
  messageInput: MessagesDataReturn['messageInput'];
  setMessageInput: MessagesDataReturn['setMessageInput'];
  isSending: MessagesDataReturn['isSending'];
  setIsSending: MessagesDataReturn['setIsSending'];
  pinnedMessages: MessagesDataReturn['pinnedMessages'];
  setPinnedMessages: MessagesDataReturn['setPinnedMessages'];
  typingTimeoutRef: MessagesDataReturn['typingTimeoutRef'];
  fileInputRef: MessagesDataReturn['fileInputRef'];
  scrollToBottom: MessagesDataReturn['scrollToBottom'];
  loadMessages: MessagesDataReturn['loadMessages'];

  // From modals hook
  editingMessage: MessagesModalsReturn['editingMessage'];
  confirmDialog: MessagesModalsReturn['confirmDialog'];
  forwardingMessage: MessagesModalsReturn['forwardingMessage'];
  conversationTitleInput: MessagesModalsReturn['conversationTitleInput'];
  closeEditModal: MessagesModalsReturn['closeEditModal'];
  openDeleteConfirm: MessagesModalsReturn['openDeleteConfirm'];
  closeDeleteConfirm: MessagesModalsReturn['closeDeleteConfirm'];
  closeEmojiPicker: MessagesModalsReturn['closeEmojiPicker'];
  setShowVoiceRecorder: MessagesModalsReturn['setShowVoiceRecorder'];
  closeNewConversationModal: MessagesModalsReturn['closeNewConversationModal'];
  setShowConversationSidebar: MessagesModalsReturn['setShowConversationSidebar'];
  closeForwardModal: MessagesModalsReturn['closeForwardModal'];
  finishEditingTitle: MessagesModalsReturn['finishEditingTitle'];
  cancelEditingTitle: MessagesModalsReturn['cancelEditingTitle'];
  openEditModal: MessagesModalsReturn['openEditModal'];
  openThread: MessagesModalsReturn['openThread'];
  openForwardModal: MessagesModalsReturn['openForwardModal'];
  startEditingTitle: MessagesModalsReturn['startEditingTitle'];
}

// =============================================
// RETURN INTERFACE
// =============================================

export interface MessagesHandlersReturn {
  handleCreateMessage: (messageData: CreateMessageInput) => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleConfirmDelete: (mode: DeleteMessageMode) => Promise<void>;
  handleTogglePin: (messageId: string) => Promise<void>;
  handleUnpinMessage: (messageId: string) => Promise<void>;
  handleEditMessage: (message: Message) => void;
  handleCloseModal: () => void;
  handleSubmitMessage: () => Promise<void>;
  handleEmojiClick: (emoji: string) => void;
  handleMessageInputChange: (value: string) => void;
  handleFileClick: () => void;
  handleImageChange: () => void;
  handleFileChange: () => void;
  handleReply: (message: Message | MessageWithReplies) => void;
  handleForwardMessage: (message: Message | MessageWithReplies) => void;
  handleForward: (conversationIds: string[]) => Promise<void>;
  handleSelectConversation: (selectedConversationId: string) => Promise<void>;
  handleDeleteConversation: (conversationIdToDelete: string) => Promise<void>;
  handleRenameConversationFromSidebar: (conversationIdToRename: string, newTitle: string) => Promise<void>;
  handleCreateConversation: (conversationData: CreateConversationInput) => Promise<void>;
  handleSendVoice: (audioBlob: Blob, duration: number) => Promise<void>;
  handleEditConversationTitle: () => void;
  handleSaveConversationTitle: () => Promise<void>;
  handleCancelEdit: () => void;
  handleTitleKeyDown: (e: React.KeyboardEvent) => void;
}

// =============================================
// HOOK
// =============================================

export function useMessagesHandlers(deps: MessagesHandlersDeps): MessagesHandlersReturn {
  const {
    user,
    currentSpace,
    messages,
    setMessages,
    setStats,
    conversations,
    setConversations,
    conversationId,
    setConversationId,
    conversationTitle,
    messageInput,
    setMessageInput,
    isSending,
    setIsSending,
    setPinnedMessages,
    typingTimeoutRef,
    fileInputRef,
    scrollToBottom,
    loadMessages,
    editingMessage,
    confirmDialog,
    forwardingMessage,
    conversationTitleInput,
    closeEditModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    closeEmojiPicker,
    setShowVoiceRecorder,
    closeNewConversationModal,
    setShowConversationSidebar,
    closeForwardModal,
    finishEditingTitle,
    cancelEditingTitle,
    openEditModal,
    openThread,
    openForwardModal,
    startEditingTitle,
  } = deps;

  // Handle create/edit message (from modal)
  const handleCreateMessage = useCallback(async (messageData: CreateMessageInput) => {
    try {
      if (editingMessage) {
        // Optimistic update for edits
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id
              ? { ...m, content: messageData.content, updated_at: new Date().toISOString() }
              : m
          )
        );
        await messagesService.updateMessage(editingMessage.id, messageData, { userId: user?.id });
      } else {
        await messagesService.createMessage(messageData);
      }
      closeEditModal();
    } catch (error) {
      logger.error('Failed to save message:', error, { component: 'page', action: 'service_call' });
      if (editingMessage) {
        setMessages((prev) =>
          prev.map((m) => (m.id === editingMessage.id ? editingMessage : m))
        );
      }
    }
  }, [editingMessage, user?.id, setMessages, closeEditModal]);

  // Handle delete message — opens confirm dialog
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    const isOwnMessage = message?.sender_id === user?.id;
    openDeleteConfirm(messageId, isOwnMessage);
  }, [messages, user?.id, openDeleteConfirm]);

  // Handle confirmed delete
  const handleConfirmDelete = useCallback(async (mode: DeleteMessageMode) => {
    const messageId = confirmDialog.messageId;
    closeDeleteConfirm();

    if (mode === 'for_me') {
      setMessages(prev => prev.filter(message => message.id !== messageId));
      toast.success('Message deleted for you');
    } else {
      setMessages(prev => prev.map(message =>
        message.id === messageId
          ? { ...message, deleted_at: new Date().toISOString(), deleted_for_everyone: true, content: '' }
          : message
      ));
      toast.success('Message deleted for everyone');
    }

    try {
      await messagesService.deleteMessage(messageId, mode, { userId: user?.id });
    } catch (error) {
      logger.error('Failed to delete message:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to delete message');
      loadMessages();
    }
  }, [confirmDialog, loadMessages, user?.id, setMessages, closeDeleteConfirm]);

  // Handle pin/unpin toggle
  const handleTogglePin = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      await messagesService.togglePin(messageId, user.id);
      if (conversationId) {
        const pinnedData = await messagesService.getPinnedMessages(conversationId);
        setPinnedMessages(pinnedData);
      }
      toast.success('Message pin toggled');
    } catch (error) {
      logger.error('Failed to toggle pin:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to update pin status');
    }
  }, [user, conversationId, setPinnedMessages]);

  // Handle unpin from pinned section
  const handleUnpinMessage = useCallback(async (messageId: string) => {
    try {
      await messagesService.unpinMessage(messageId);
      if (conversationId) {
        const pinnedData = await messagesService.getPinnedMessages(conversationId);
        setPinnedMessages(pinnedData);
      }
      toast.success('Message unpinned');
    } catch (error) {
      logger.error('Failed to unpin:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to unpin message');
    }
  }, [conversationId, setPinnedMessages]);

  // Handle edit message — opens modal
  const handleEditMessage = useCallback((message: Message) => {
    openEditModal(message);
  }, [openEditModal]);

  // Handle close modal
  const handleCloseModal = useCallback(() => {
    closeEditModal();
  }, [closeEditModal]);

  // Handle submit message from MentionInput
  const handleSubmitMessage = useCallback(async () => {
    if (!messageInput.trim()) return;
    if (isSending) return;
    if (!conversationId) {
      toast.error('No conversation selected. Please refresh the page.');
      return;
    }
    if (!currentSpace || !user) {
      toast.error('Please log in to send messages');
      return;
    }

    // Remove typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    messagesService.removeTypingIndicator(conversationId, user.id).catch((error) => {
      logger.error('Failed to remove typing indicator:', error, { component: 'page', action: 'service_call' });
    });

    // Create optimistic message
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticMessage: Message = {
      id: tempId,
      space_id: currentSpace.id,
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageInput.trim(),
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachments: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageInput('');
    setTimeout(scrollToBottom, 50);
    setIsSending(true);

    try {
      const savedMessage = await messagesService.createMessage({
        space_id: currentSpace.id,
        conversation_id: conversationId,
        sender_id: user.id,
        content: optimisticMessage.content,
      });

      // Process @mentions
      try {
        await mentionsService.processMessageMentions(
          savedMessage.id,
          savedMessage.content,
          user.id,
          currentSpace.id
        );
      } catch (mentionError) {
        logger.error('Failed to process mentions', mentionError, { component: 'page', action: 'service_call' });
      }

      // Replace optimistic message with server message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...savedMessage } : m))
      );

      // Cleanup duplicate timeout
      setTimeout(() => {
        setMessages((prev) => {
          const serverMessageExists = prev.some(m => m.id === savedMessage.id && m.id !== tempId);
          if (serverMessageExists) {
            return prev.filter(m => m.id !== tempId);
          }
          return prev;
        });
      }, 2000);

      toast.success('Message sent!');
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      logger.error('Failed to send message:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to send message', { description: 'Please try again' });
      setMessageInput(optimisticMessage.content);
    } finally {
      setTimeout(() => setIsSending(false), 300);
    }
  }, [messageInput, isSending, conversationId, currentSpace, user, scrollToBottom, typingTimeoutRef, setMessages, setMessageInput, setIsSending]);

  // Handle emoji click
  const handleEmojiClick = useCallback((emoji: string) => {
    setMessageInput(prev => prev + emoji);
    closeEmojiPicker();
  }, [setMessageInput, closeEmojiPicker]);

  // Handle message input change with typing indicator
  const handleMessageInputChange = useCallback((value: string) => {
    setMessageInput(value);

    if (conversationId && user) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      messagesService.updateTypingIndicator(conversationId, user.id).catch((error) => {
        logger.error('Failed to update typing indicator:', error, { component: 'page', action: 'service_call' });
      });

      typingTimeoutRef.current = setTimeout(() => {
        if (conversationId && user) {
          messagesService.removeTypingIndicator(conversationId, user.id).catch((error) => {
            logger.error('Failed to remove typing indicator:', error, { component: 'page', action: 'service_call' });
          });
        }
      }, 3000);
    }
  }, [conversationId, user, setMessageInput, typingTimeoutRef]);

  // Handle file click
  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  // Handle image change (placeholder)
  const handleImageChange = useCallback(() => {
  }, []);

  // Handle file change (placeholder)
  const handleFileChange = useCallback(() => {
  }, []);

  // Handle reply — opens thread view
  const handleReply = useCallback((message: Message | MessageWithReplies) => {
    openThread(message);
  }, [openThread]);

  // Handle forward message — opens forward modal
  const handleForwardMessage = useCallback((message: Message | MessageWithReplies) => {
    openForwardModal(message);
  }, [openForwardModal]);

  // Handle forward to conversations
  const handleForward = useCallback(async (conversationIds: string[]) => {
    if (!forwardingMessage || !currentSpace || !user) return;

    try {
      await Promise.all(
        conversationIds.map((convId) =>
          messagesService.createMessage({
            space_id: currentSpace.id,
            conversation_id: convId,
            sender_id: user.id,
            content: `\u{1F4E8} Forwarded: ${forwardingMessage.content}`,
          })
        )
      );

      toast.success(`Message forwarded to ${conversationIds.length} conversation${conversationIds.length > 1 ? 's' : ''}`);
      closeForwardModal();
    } catch (error) {
      logger.error('Failed to forward message:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to forward message');
      throw error;
    }
  }, [forwardingMessage, currentSpace, user, closeForwardModal]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback(async (selectedConversationId: string) => {
    if (!currentSpace) return;

    try {
      setConversationId(selectedConversationId);

      const [messagesData, pinnedData] = await Promise.all([
        messagesService.getMessages(selectedConversationId),
        messagesService.getPinnedMessages(selectedConversationId),
      ]);

      setMessages(messagesData);
      setPinnedMessages(pinnedData);
      setShowConversationSidebar(false);

      const markedCount = await messagesService.markConversationAsRead(selectedConversationId);
      if (markedCount > 0) {
        setMessages(prev => prev.map(m => ({
          ...m,
          read: true,
          read_at: m.read_at || new Date().toISOString()
        })));
        const newStats = await messagesService.getMessageStats(currentSpace.id);
        setStats(newStats);
      }
    } catch (error) {
      logger.error('Failed to load conversation:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to load conversation');
    }
  }, [currentSpace, setConversationId, setMessages, setPinnedMessages, setShowConversationSidebar, setStats]);

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback(async (conversationIdToDelete: string) => {
    if (!currentSpace || !user) return;

    setConversations(prev => prev.filter(conv => conv.id !== conversationIdToDelete));

    if (conversationIdToDelete === conversationId) {
      const remainingConversations = conversations.filter(c => c.id !== conversationIdToDelete);
      if (remainingConversations.length > 0) {
        setConversationId(remainingConversations[0].id);
        setMessages([]);
      } else {
        setConversationId(null);
        setMessages([]);
      }
    }

    try {
      await messagesService.deleteConversation(conversationIdToDelete);

      if (conversationIdToDelete === conversationId && conversations.filter(c => c.id !== conversationIdToDelete).length > 0) {
        const newActiveConversation = conversations.filter(c => c.id !== conversationIdToDelete)[0];
        const messagesData = await messagesService.getMessages(newActiveConversation.id);
        setMessages(messagesData);
      }

      toast.success('Conversation deleted');
    } catch (error) {
      logger.error('Failed to delete conversation:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to delete conversation');
      const conversationsData = await messagesService.getConversationsList(currentSpace.id, user.id);
      setConversations(conversationsData);
    }
  }, [currentSpace, user, conversationId, conversations, setConversations, setConversationId, setMessages]);

  // Handle renaming a conversation from sidebar
  const handleRenameConversationFromSidebar = useCallback(async (conversationIdToRename: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      await messagesService.updateConversation(conversationIdToRename, { title: newTitle.trim() });

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationIdToRename
            ? { ...conv, title: newTitle.trim() }
            : conv
        )
      );

      toast.success('Conversation renamed');
    } catch (error) {
      logger.error('Failed to update conversation title:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to rename conversation');
      throw error;
    }
  }, [setConversations]);

  // Handle creating a new conversation
  const handleCreateConversation = useCallback(async (conversationData: CreateConversationInput) => {
    if (!currentSpace) return;

    try {
      const newConversation = await messagesService.createConversation(conversationData);

      if (user?.id) {
        const conversationsData = await messagesService.getConversationsList(currentSpace.id, user.id);
        setConversations(conversationsData);
      }

      await handleSelectConversation(newConversation.id);
      closeNewConversationModal();
      toast.success('Conversation created successfully');
    } catch (error) {
      logger.error('Failed to create conversation:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to create conversation');
      throw error;
    }
  }, [currentSpace, handleSelectConversation, user?.id, setConversations, closeNewConversationModal]);

  // Handle sending voice message
  const handleSendVoice = useCallback(async (audioBlob: Blob, duration: number) => {
    void duration;
    if (!currentSpace || !user || !conversationId) {
      toast.error('Unable to send voice message');
      return;
    }

    try {
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });

      const tempMessage = await messagesService.createMessage({
        space_id: currentSpace.id,
        conversation_id: conversationId,
        sender_id: user.id,
        content: '\u{1F3A4} Voice message',
      });

      await fileUploadService.uploadFile(
        audioFile,
        currentSpace.id,
        tempMessage.id,
        () => {}
      );

      setShowVoiceRecorder(false);
      toast.success('Voice message sent');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      logger.error('Failed to send voice message:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to send voice message');
      throw error;
    }
  }, [currentSpace, user, conversationId, scrollToBottom, setShowVoiceRecorder]);

  // Handle conversation title editing
  const handleEditConversationTitle = useCallback(() => {
    startEditingTitle(conversationTitle);
  }, [startEditingTitle, conversationTitle]);

  const handleSaveConversationTitle = useCallback(async () => {
    if (!conversationId || !conversationTitleInput.trim() || conversationTitleInput === conversationTitle) {
      finishEditingTitle();
      return;
    }

    try {
      await messagesService.updateConversation(conversationId, { title: conversationTitleInput.trim() });

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, title: conversationTitleInput.trim() }
            : conv
        )
      );

      finishEditingTitle();
      toast.success('Conversation renamed');
    } catch (error) {
      logger.error('Failed to update conversation title:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to rename conversation');
      finishEditingTitle();
    }
  }, [conversationId, conversationTitleInput, conversationTitle, setConversations, finishEditingTitle]);

  const handleCancelEdit = useCallback(() => {
    cancelEditingTitle();
  }, [cancelEditingTitle]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveConversationTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveConversationTitle, handleCancelEdit]);

  return {
    handleCreateMessage,
    handleDeleteMessage,
    handleConfirmDelete,
    handleTogglePin,
    handleUnpinMessage,
    handleEditMessage,
    handleCloseModal,
    handleSubmitMessage,
    handleEmojiClick,
    handleMessageInputChange,
    handleFileClick,
    handleImageChange,
    handleFileChange,
    handleReply,
    handleForwardMessage,
    handleForward,
    handleSelectConversation,
    handleDeleteConversation,
    handleRenameConversationFromSidebar,
    handleCreateConversation,
    handleSendVoice,
    handleEditConversationTitle,
    handleSaveConversationTitle,
    handleCancelEdit,
    handleTitleKeyDown,
  };
}
