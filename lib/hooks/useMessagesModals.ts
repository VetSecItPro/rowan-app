import { useState, useCallback } from 'react';
import type { Message, MessageWithReplies } from '@/lib/services/messages-service';

// =============================================
// RETURN INTERFACE
// =============================================

export interface MessagesModalsReturn {
  // Edit message modal
  isModalOpen: boolean;
  editingMessage: Message | null;

  // Delete confirm dialog
  confirmDialog: { isOpen: boolean; messageId: string; isOwnMessage: boolean };

  // Thread view
  selectedThread: MessageWithReplies | null;

  // Emoji picker
  showEmojiPicker: boolean;

  // Voice recorder
  showVoiceRecorder: boolean;

  // New conversation modal
  showNewConversationModal: boolean;

  // Conversation sidebar (mobile)
  showConversationSidebar: boolean;

  // Forward modal
  showForwardModal: boolean;
  forwardingMessage: Message | null;

  // Conversation title editing
  editingConversationTitle: boolean;
  conversationTitleInput: string;

  // Members panel
  showMembersPanel: boolean;

  // Modal actions
  openEditModal: (message: Message) => void;
  closeEditModal: () => void;
  openDeleteConfirm: (messageId: string, isOwnMessage: boolean) => void;
  closeDeleteConfirm: () => void;
  openThread: (message: Message | MessageWithReplies) => void;
  closeThread: () => void;
  toggleEmojiPicker: () => void;
  closeEmojiPicker: () => void;
  toggleVoiceRecorder: () => void;
  setShowVoiceRecorder: React.Dispatch<React.SetStateAction<boolean>>;
  openNewConversationModal: () => void;
  closeNewConversationModal: () => void;
  setShowConversationSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  openForwardModal: (message: Message | MessageWithReplies) => void;
  closeForwardModal: () => void;
  startEditingTitle: (currentTitle: string) => void;
  setConversationTitleInput: React.Dispatch<React.SetStateAction<string>>;
  cancelEditingTitle: () => void;
  finishEditingTitle: () => void;
  setShowMembersPanel: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMembersPanel: () => void;
}

// =============================================
// HOOK
// =============================================

export function useMessagesModals(): MessagesModalsReturn {
  // Edit message modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Delete confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, messageId: '', isOwnMessage: false });

  // Thread view
  const [selectedThread, setSelectedThread] = useState<MessageWithReplies | null>(null);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice recorder
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // New conversation modal
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  // Conversation sidebar (mobile)
  const [showConversationSidebar, setShowConversationSidebar] = useState(false);

  // Forward modal
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  // Conversation title editing
  const [editingConversationTitle, setEditingConversationTitle] = useState(false);
  const [conversationTitleInput, setConversationTitleInput] = useState('');

  // Members panel
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  // --- Modal actions ---

  const openEditModal = useCallback((message: Message) => {
    setEditingMessage(message);
    setIsModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMessage(null);
  }, []);

  const openDeleteConfirm = useCallback((messageId: string, isOwnMessage: boolean) => {
    setConfirmDialog({ isOpen: true, messageId, isOwnMessage });
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setConfirmDialog({ isOpen: false, messageId: '', isOwnMessage: false });
  }, []);

  const openThread = useCallback((message: Message | MessageWithReplies) => {
    setSelectedThread(message as MessageWithReplies);
  }, []);

  const closeThread = useCallback(() => {
    setSelectedThread(null);
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  const closeEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false);
  }, []);

  const toggleVoiceRecorder = useCallback(() => {
    setShowVoiceRecorder(prev => !prev);
  }, []);

  const openNewConversationModal = useCallback(() => {
    setShowNewConversationModal(true);
  }, []);

  const closeNewConversationModal = useCallback(() => {
    setShowNewConversationModal(false);
  }, []);

  const openForwardModal = useCallback((message: Message | MessageWithReplies) => {
    setForwardingMessage(message as Message);
    setShowForwardModal(true);
  }, []);

  const closeForwardModal = useCallback(() => {
    setShowForwardModal(false);
    setForwardingMessage(null);
  }, []);

  const startEditingTitle = useCallback((currentTitle: string) => {
    setConversationTitleInput(currentTitle);
    setEditingConversationTitle(true);
  }, []);

  const cancelEditingTitle = useCallback(() => {
    setEditingConversationTitle(false);
    setConversationTitleInput('');
  }, []);

  const finishEditingTitle = useCallback(() => {
    setEditingConversationTitle(false);
  }, []);

  const toggleMembersPanel = useCallback(() => {
    setShowMembersPanel(prev => !prev);
  }, []);

  return {
    isModalOpen,
    editingMessage,
    confirmDialog,
    selectedThread,
    showEmojiPicker,
    showVoiceRecorder,
    showNewConversationModal,
    showConversationSidebar,
    showForwardModal,
    forwardingMessage,
    editingConversationTitle,
    conversationTitleInput,
    showMembersPanel,
    openEditModal,
    closeEditModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    openThread,
    closeThread,
    toggleEmojiPicker,
    closeEmojiPicker,
    toggleVoiceRecorder,
    setShowVoiceRecorder,
    openNewConversationModal,
    closeNewConversationModal,
    setShowConversationSidebar,
    openForwardModal,
    closeForwardModal,
    startEditingTitle,
    setConversationTitleInput,
    cancelEditingTitle,
    finishEditingTitle,
    setShowMembersPanel,
    toggleMembersPanel,
  };
}
