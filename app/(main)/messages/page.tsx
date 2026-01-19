'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Search, Mail, Clock, MessageSquare, Smile, Paperclip, TrendingUp, X, Users } from 'lucide-react';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { MessageCard } from '@/components/messages/MessageCard';
import { NewMessageModal } from '@/components/messages/NewMessageModal';
import { DeleteMessageModal } from '@/components/messages/DeleteMessageModal';
import { DeleteMessageMode } from '@/lib/services/messages-service';
import { ThreadView } from '@/components/messages/ThreadView';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { VoiceRecorder } from '@/components/messages/VoiceRecorder';
import { PinnedMessages } from '@/components/messages/PinnedMessages';
import { MentionInput } from '@/components/messages/MentionInput';
import { ConversationSidebar } from '@/components/messages/ConversationSidebar';
import { NewConversationModal } from '@/components/messages/NewConversationModal';
import { ForwardMessageModal } from '@/components/messages/ForwardMessageModal';
import { MessageNotificationBell } from '@/components/messages/MessageNotificationBell';
import { SwipeableMessageCard } from '@/components/messages/SwipeableMessageCard';
import { fileUploadService } from '@/lib/services/file-upload-service';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { messagesService, Message, MessageWithReplies, CreateMessageInput, TypingIndicator as TypingIndicatorType, Conversation, CreateConversationInput } from '@/lib/services/messages-service';
import { mentionsService } from '@/lib/services/mentions-service';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Family-friendly universal emojis (30 total) - organized by theme
const EMOJIS = [
  // Smiles & Emotions
  '😊', '😂', '😇', '😎', '😘', '🥰', '🤗', '❤️',
  // Gestures & Hands
  '👍', '🙏', '👏', '🤝', '💪',
  // Celebrations & Parties
  '🎉', '🎈', '🎂', '🎁', '🎊',
  // Nature & Flowers
  '🌸', '🌺', '💐', '🌈', '☀️',
  // Sparkles & Stars
  '✨', '🌟',
  // Food & Drinks
  '🍕', '☕',
  // Other
  '📅', '✅', '🏠'
];

export default function MessagesPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, messageId: '', isOwnMessage: false });
  const [selectedThread, setSelectedThread] = useState<MessageWithReplies | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorType[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [showConversationSidebar, setShowConversationSidebar] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [editingConversationTitle, setEditingConversationTitle] = useState(false);
  const [conversationTitleInput, setConversationTitleInput] = useState('');
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  const [stats, setStats] = useState({
    thisWeek: 0,
    unread: 0,
    today: 0,
    total: 0,
  });

  const filteredMessages = messages;

  // Memoize date label computation
  const getDateLabel = useCallback((date: Date): string => {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'EEEE, MMMM d, yyyy');
    }
  }, []);

  // Memoize date separator logic
  const shouldShowDateSeparator = useCallback((currentMessage: Message, previousMessage: Message | null): boolean => {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.created_at);
    const previousDate = new Date(previousMessage.created_at);

    return !isSameDay(currentDate, previousDate);
  }, []);

  // Memoize loadMessages callback
  const loadMessages = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get or create default conversation for the space
      const conversations = await messagesService.getConversations(currentSpace.id);

      let defaultConversation;
      if (conversations.length === 0) {
        // Create a default conversation
        defaultConversation = await messagesService.createConversation({
          space_id: currentSpace.id,
          title: 'General',
          participants: [],
        });
      } else {
        defaultConversation = conversations[0];
      }

      setConversationId(defaultConversation.id);

      const [messagesData, statsData, pinnedData, conversationsData] = await Promise.all([
        messagesService.getMessages(defaultConversation.id),
        messagesService.getMessageStats(currentSpace.id),
        messagesService.getPinnedMessages(defaultConversation.id),
        messagesService.getConversationsList(currentSpace.id, user.id),
      ]);
      setMessages(messagesData);
      setStats(statsData);
      setPinnedMessages(pinnedData);
      setConversations(conversationsData);

    } catch (error) {
      logger.error('Failed to load messages:', error, { component: 'page', action: 'service_call' });
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !user) {
      return;
    }

    // Subscribe to real-time updates
    const channel = messagesService.subscribeToMessages(conversationId, {
      onInsert: (newMessage) => {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // Show notification for new messages from others
        if (newMessage.sender_id !== user.id) {
          toast.success('New message received', {
            description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
          });
        }

        // Auto-scroll to bottom
        setTimeout(scrollToBottom, 100);
      },
      onUpdate: (updatedMessage) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
        );
      },
      onDelete: (messageId) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
    });

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        messagesService.unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user, scrollToBottom]);

  // Poll for typing users
  useEffect(() => {
    if (!conversationId || !user) return;

    // Poll every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const typingData = await messagesService.getTypingUsers(conversationId, user.id);
        setTypingUsers(typingData);
      } catch (error) {
        logger.error('Failed to fetch typing users:', error, { component: 'page', action: 'service_call' });
      }
    }, 2000);

    // Initial fetch
    messagesService.getTypingUsers(conversationId, user.id)
      .then(setTypingUsers)
      .catch((error) => logger.error('Failed to fetch typing users', error, { component: 'page', action: 'service_call' }));

    return () => {
      clearInterval(pollInterval);
    };
  }, [conversationId, user]);

  // Cleanup typing indicator on unmount or when sending message
  useEffect(() => {
    return () => {
      if (conversationId && user && typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        messagesService.removeTypingIndicator(conversationId, user.id).catch((error) => {
          logger.error('Failed to cleanup typing indicator:', error, { component: 'page', action: 'service_call' });
        });
      }
    };
  }, [conversationId, user]);

  // Memoize handleCreateMessage callback
  const handleCreateMessage = useCallback(async (messageData: CreateMessageInput) => {
    try {
      if (editingMessage) {
        // Optimistic update for edits - update UI immediately
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id
              ? {
                  ...m,
                  content: messageData.content,
                  updated_at: new Date().toISOString()
                }
              : m
          )
        );

        await messagesService.updateMessage(editingMessage.id, messageData, { userId: user?.id });
      } else {
        await messagesService.createMessage(messageData);
      }
      // Real-time subscription will handle adding new messages and confirming edits
      setEditingMessage(null);
    } catch (error) {
      logger.error('Failed to save message:', error, { component: 'page', action: 'service_call' });

      // Revert optimistic update on error for edits
      if (editingMessage) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id ? editingMessage : m
          )
        );
      }
    }
  }, [editingMessage, user?.id]);

  // Memoize handleDeleteMessage callback - now tracks if it's own message for delete options
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    const isOwnMessage = message?.sender_id === user?.id;
    setConfirmDialog({ isOpen: true, messageId, isOwnMessage });
  }, [messages, user?.id]);

  const handleConfirmDelete = useCallback(async (mode: DeleteMessageMode) => {
    const messageId = confirmDialog.messageId;
    setConfirmDialog({ isOpen: false, messageId: '', isOwnMessage: false });

    if (mode === 'for_me') {
      // Delete for me - just hide from UI locally (message still exists for others)
      setMessages(prev => prev.filter(message => message.id !== messageId));
      toast.success('Message deleted for you');
    } else {
      // Delete for everyone - show placeholder, update message in place
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
      // Revert optimistic update on error
      loadMessages();
    }
  }, [confirmDialog, loadMessages, user?.id]);

  // Handle pin/unpin toggle
  const handleTogglePin = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      await messagesService.togglePin(messageId, user.id);

      // Reload pinned messages
      if (conversationId) {
        const pinnedData = await messagesService.getPinnedMessages(conversationId);
        setPinnedMessages(pinnedData);
      }

      toast.success('Message pin toggled');
    } catch (error) {
      logger.error('Failed to toggle pin:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to update pin status');
    }
  }, [user, conversationId]);

  // Handle unpin from pinned section
  const handleUnpinMessage = useCallback(async (messageId: string) => {
    try {
      await messagesService.unpinMessage(messageId);

      // Reload pinned messages
      if (conversationId) {
        const pinnedData = await messagesService.getPinnedMessages(conversationId);
        setPinnedMessages(pinnedData);
      }

      toast.success('Message unpinned');
    } catch (error) {
      logger.error('Failed to unpin:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to unpin message');
    }
  }, [conversationId]);

  // Memoize handleEditMessage callback
  const handleEditMessage = useCallback((message: Message) => {
    setEditingMessage(message);
    setIsModalOpen(true);
  }, []);

  // Memoize handleCloseModal callback
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMessage(null);
  }, []);

  // Memoize handleSubmitMessage for MentionInput
  const handleSubmitMessage = useCallback(async () => {
    if (!messageInput.trim()) {
      return;
    }
    if (isSending) {
      return;
    }
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

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageInput('');
    setTimeout(scrollToBottom, 50);
    setIsSending(true);

    try {
      // Send to server
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
        // Don't block message sending if mentions fail
      }

      // Replace optimistic message with server message immediately
      // instead of relying on real-time subscription
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...savedMessage } : m
        )
      );

      // Also set up a cleanup timeout in case real-time adds a duplicate
      setTimeout(() => {
        setMessages((prev) => {
          const serverMessageExists = prev.some(m => m.id === savedMessage.id && m.id !== tempId);
          if (serverMessageExists) {
            // Remove temp message if server message was added by real-time
            return prev.filter(m => m.id !== tempId);
          }
          return prev;
        });
      }, 2000);

      toast.success('Message sent!');
    } catch (error) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      logger.error('Failed to send message:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to send message', {
        description: 'Please try again',
      });
      // Restore message input on error
      setMessageInput(optimisticMessage.content);
    } finally {
      setTimeout(() => setIsSending(false), 300);
    }
  }, [messageInput, isSending, conversationId, currentSpace, user, scrollToBottom]);

  // Memoize handleEmojiClick callback
  const handleEmojiClick = useCallback((emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // Memoize handleMessageInputChange callback with typing indicator
  const handleMessageInputChange = useCallback((value: string) => {
    setMessageInput(value);

    // Update typing indicator (throttled)
    if (conversationId && user) {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing indicator
      messagesService.updateTypingIndicator(conversationId, user.id).catch((error) => {
        logger.error('Failed to update typing indicator:', error, { component: 'page', action: 'service_call' });
      });

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (conversationId && user) {
          messagesService.removeTypingIndicator(conversationId, user.id).catch((error) => {
            logger.error('Failed to remove typing indicator:', error, { component: 'page', action: 'service_call' });
          });
        }
      }, 3000);
    }
  }, [conversationId, user]);

  // Memoize toggleEmojiPicker callback
  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  // Memoize closeEmojiPicker callback
  const closeEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false);
  }, []);

  // Memoize handleFileClick callback
  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Memoize handleImageChange callback
  const handleImageChange = useCallback(() => {
  }, []);

  // Memoize handleFileChange callback
  const handleFileChange = useCallback(() => {
  }, []);

  const emptyStateMessage = {
    primary: 'No messages yet',
    secondary: 'Start the conversation below!',
  };


  // Handle opening thread view
  const handleReply = useCallback((message: Message | MessageWithReplies) => {
    setSelectedThread(message as MessageWithReplies);
  }, []);

  // Handle closing thread view
  const handleCloseThread = useCallback(() => {
    setSelectedThread(null);
  }, []);

  // Handle forward message
  const handleForwardMessage = useCallback((message: Message | MessageWithReplies) => {
    setForwardingMessage(message as Message);
    setShowForwardModal(true);
  }, []);

  // Handle forward to conversations
  const handleForward = useCallback(async (conversationIds: string[]) => {
    if (!forwardingMessage || !currentSpace || !user) return;

    try {
      // Send the message to each selected conversation
      await Promise.all(
        conversationIds.map((convId) =>
          messagesService.createMessage({
            space_id: currentSpace.id,
            conversation_id: convId,
            sender_id: user.id,
            content: `📨 Forwarded: ${forwardingMessage.content}`,
          })
        )
      );

      toast.success(`Message forwarded to ${conversationIds.length} conversation${conversationIds.length > 1 ? 's' : ''}`);
      setShowForwardModal(false);
      setForwardingMessage(null);
    } catch (error) {
      logger.error('Failed to forward message:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to forward message');
      throw error;
    }
  }, [forwardingMessage, currentSpace, user]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback(async (selectedConversationId: string) => {
    if (!currentSpace) return;

    try {
      setConversationId(selectedConversationId);

      // Load messages and pinned messages for the selected conversation
      const [messagesData, pinnedData] = await Promise.all([
        messagesService.getMessages(selectedConversationId),
        messagesService.getPinnedMessages(selectedConversationId),
      ]);

      setMessages(messagesData);
      setPinnedMessages(pinnedData);
      setShowConversationSidebar(false); // Close mobile sidebar

      // Mark all unread messages in this conversation as read
      const markedCount = await messagesService.markConversationAsRead(selectedConversationId);
      if (markedCount > 0) {
        // Update local message state to reflect read status
        setMessages(prev => prev.map(m => ({
          ...m,
          read: true,
          read_at: m.read_at || new Date().toISOString()
        })));
        // Refresh stats to update unread counter
        const newStats = await messagesService.getMessageStats(currentSpace.id);
        setStats(newStats);
      }
    } catch (error) {
      logger.error('Failed to load conversation:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to load conversation');
    }
  }, [currentSpace]);

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback(async (conversationIdToDelete: string) => {
    if (!currentSpace || !user) return;

    // Optimistic update - remove conversation from UI immediately
    setConversations(prev => prev.filter(conv => conv.id !== conversationIdToDelete));

    // If we're deleting the active conversation, switch to first remaining conversation
    if (conversationIdToDelete === conversationId) {
      const remainingConversations = conversations.filter(c => c.id !== conversationIdToDelete);
      if (remainingConversations.length > 0) {
        setConversationId(remainingConversations[0].id);
        setMessages([]); // Clear messages while loading new conversation
      } else {
        setConversationId(null);
        setMessages([]);
      }
    }

    try {
      await messagesService.deleteConversation(conversationIdToDelete);

      // If we switched to a new conversation, load its messages
      if (conversationIdToDelete === conversationId && conversations.filter(c => c.id !== conversationIdToDelete).length > 0) {
        const newActiveConversation = conversations.filter(c => c.id !== conversationIdToDelete)[0];
        const messagesData = await messagesService.getMessages(newActiveConversation.id);
        setMessages(messagesData);
      }

      toast.success('Conversation deleted');
    } catch (error) {
      logger.error('Failed to delete conversation:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to delete conversation');
      // Revert optimistic update on error
      const conversationsData = await messagesService.getConversationsList(currentSpace.id, user.id);
      setConversations(conversationsData);
    }
  }, [currentSpace, user, conversationId, conversations]);

  // Handle renaming a conversation from sidebar
  const handleRenameConversationFromSidebar = useCallback(async (conversationIdToRename: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      // Update the conversation title in the backend
      await messagesService.updateConversation(conversationIdToRename, { title: newTitle.trim() });

      // Optimistically update local state
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
      throw error; // Re-throw to let the sidebar handle the error state
    }
  }, []);

  // Handle creating a new conversation
  const handleCreateConversation = useCallback(async (conversationData: CreateConversationInput) => {
    if (!currentSpace) return;

    try {
      const newConversation = await messagesService.createConversation(conversationData);

      // Reload conversations list
      if (user?.id) {
        const conversationsData = await messagesService.getConversationsList(currentSpace.id, user.id);
        setConversations(conversationsData);
      }

      // Switch to the new conversation
      await handleSelectConversation(newConversation.id);

      // Close the modal
      setShowNewConversationModal(false);

      toast.success('Conversation created successfully');
    } catch (error) {
      logger.error('Failed to create conversation:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to create conversation');
      throw error;
    }
  }, [currentSpace, handleSelectConversation, user?.id]);

  // Handle sending voice message
  const handleSendVoice = useCallback(async (audioBlob: Blob, duration: number) => {
    void duration;
    if (!currentSpace || !user || !conversationId) {
      toast.error('Unable to send voice message');
      return;
    }

    try {
      // Create a File from the Blob
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      // Create a temporary message first
      const tempMessage = await messagesService.createMessage({
        space_id: currentSpace.id,
        conversation_id: conversationId,
        sender_id: user.id,
        content: '🎤 Voice message',
      });

      // Upload the audio file
      await fileUploadService.uploadFile(
        audioFile,
        currentSpace.id,
        tempMessage.id,
        () => {} // Progress callback not needed here
      );

      setShowVoiceRecorder(false);
      toast.success('Voice message sent');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      logger.error('Failed to send voice message:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to send voice message');
      throw error;
    }
  }, [currentSpace, user, conversationId, scrollToBottom]);

  // Get current conversation
  const currentConversation = conversations.find(conv => conv.id === conversationId);
  const conversationTitle = currentConversation?.title || 'Conversation';

  // Handle conversation title editing
  const handleEditConversationTitle = () => {
    setConversationTitleInput(conversationTitle);
    setEditingConversationTitle(true);
  };

  const handleSaveConversationTitle = async () => {
    if (!conversationId || !conversationTitleInput.trim() || conversationTitleInput === conversationTitle) {
      setEditingConversationTitle(false);
      return;
    }

    try {
      // Update the conversation title in the backend
      await messagesService.updateConversation(conversationId, { title: conversationTitleInput.trim() });

      // Optimistically update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, title: conversationTitleInput.trim() }
            : conv
        )
      );

      setEditingConversationTitle(false);
      toast.success('Conversation renamed');
    } catch (error) {
      logger.error('Failed to update conversation title:', error, { component: 'page', action: 'service_call' });
      toast.error('Failed to rename conversation');
      setEditingConversationTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingConversationTitle(false);
    setConversationTitleInput('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveConversationTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Messages' }]} hideFooterOnMobile>
      <PageErrorBoundary>
        {/* Mobile: fixed height container that doesn't scroll; Desktop: normal layout */}
        <div className="md:p-8 p-2 h-[calc(100dvh-100px)] md:h-auto overflow-hidden md:overflow-visible">
        <div className="max-w-7xl mx-auto h-full md:h-auto flex flex-col md:block md:space-y-8">
          {/* Header - Hidden on mobile for more chat space */}
          <div className="hidden md:flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-messages flex items-center justify-center">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-messages bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-sm sm:text-base text-gray-400 mt-1">
                Stay connected with your partner
              </p>
            </div>
            {/* Notification Bell */}
            {user && currentSpace && (
              <MessageNotificationBell
                userId={user.id}
                spaceId={currentSpace.id}
              />
            )}
          </div>


          {/* Stats Dashboard - Collapsed on mobile, expanded on desktop */}
          <CollapsibleStatsGrid
            icon={MessageCircle}
            title="Messages Stats"
            summary={`${stats.unread} unread • ${stats.today} today`}
            iconGradient="bg-gradient-messages"
            gridClassName="stats-grid-mobile gap-3 sm:gap-6"
          >
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-400 font-medium">Today</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-white">{stats.today}</p>
                {stats.today > 0 && (
                  <div className="flex items-center gap-1 text-green-400">
                    <MessageSquare className="w-3 h-3" />
                    <span className="text-xs font-medium">Active</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-400 font-medium">This Week</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-messages rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-white">{stats.thisWeek}</p>
                {stats.thisWeek > 0 && (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">Recent</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-400 font-medium">Unread</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-white">{stats.unread}</p>
                {stats.unread > 0 && (
                  <div className="flex items-center gap-1 text-blue-400">
                    <Mail className="w-3 h-3" />
                    <span className="text-xs font-medium">New!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-400 font-medium">All Time</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-white">{stats.total}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-purple-400">
                    <MessageCircle className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleStatsGrid>

          {/* Conversations and Chat Interface */}
          <div className="flex gap-4 flex-1 min-h-0 md:h-chat-container md:min-h-[500px]">
            {/* Conversation Sidebar - Desktop */}
            <div className="hidden md:block w-80 flex-shrink-0">
              <div className="sticky top-4 h-full">
                <ConversationSidebar
                  conversations={conversations}
                  activeConversationId={conversationId || undefined}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={() => setShowNewConversationModal(true)}
                  onDeleteConversation={handleDeleteConversation}
                  onRenameConversation={handleRenameConversationFromSidebar}
                />
              </div>
            </div>

            {/* Chat Interface - WhatsApp Style */}
            <div className="flex-1 min-h-0 bg-[#efeae2] bg-[#0b141a] md:rounded-3xl overflow-hidden flex flex-col md:border md:border-gray-700">
            {/* Chat Header - WhatsApp Style */}
            <div className="px-3 py-2 bg-[#f0f2f5] bg-[#202c33] border-b border-gray-700">
              <div className="flex items-center gap-3">
                {/* Back/Menu Button */}
                <button
                  onClick={() => setShowConversationSidebar(true)}
                  className="md:hidden p-2 -ml-1 hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Open conversations"
                >
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Avatar */}
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  {editingConversationTitle ? (
                    <input
                      type="text"
                      value={conversationTitleInput}
                      onChange={(e) => setConversationTitleInput(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={handleSaveConversationTitle}
                      autoFocus
                      className="text-base font-semibold text-white bg-transparent border-b-2 border-emerald-500 outline-none w-full max-w-[200px]"
                    />
                  ) : (
                    <h2
                      className="text-base font-semibold text-white truncate cursor-pointer hover:text-emerald-400 transition-colors"
                      onClick={handleEditConversationTitle}
                    >
                      {conversationTitle}
                    </h2>
                  )}
                  <p className="text-xs text-emerald-400">online</p>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowMembersPanel(!showMembersPanel)}
                    className={`p-2 rounded-full transition-colors ${
                      showMembersPanel
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : 'hover:bg-gray-700 text-gray-400'
                    }`}
                    title="View members"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <button className="hidden sm:flex p-2 hover:bg-gray-700 rounded-full transition-colors">
                    <Search className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Members Panel - Slides down */}
              {showMembersPanel && (
                <div className="px-4 py-3 bg-gray-800/80 backdrop-blur-xl border-b border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-300">Chat Members</h3>
                    <button
                      onClick={() => setShowMembersPanel(false)}
                      className="p-1 hover:bg-gray-700 rounded-full"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Current user */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 rounded-full">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {user?.user_metadata?.name?.charAt(0)?.toUpperCase() || 'Y'}
                      </div>
                      <span className="text-sm text-gray-300">You</span>
                    </div>
                    {/* Show other space members */}
                    {currentSpace && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-full">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          <Users className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-400">Space members</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Thread Navigation Bar */}
            {conversations.length > 1 && (
              <div className="md:hidden px-2 py-1.5 border-b border-gray-700 bg-[#f0f2f5] bg-[#202c33]">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {/* New Thread Button - First */}
                  <button
                    onClick={() => setShowNewConversationModal(true)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-all duration-200"
                  >
                    + New
                  </button>
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        conv.id === conversationId
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                          : 'bg-gray-700/60 text-gray-300 border border-gray-600/50'
                      }`}
                    >
                      <span className="truncate max-w-[100px] inline-block align-middle">
                        {conv.title || 'Untitled'}
                      </span>
                      {conv.unread_count > 0 && conv.id !== conversationId && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Area - WhatsApp Style */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1 relative"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300000008'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#efeae2'
              }}
            >
              {/* Dark mode background override */}
              <div className="hidden block absolute inset-0 bg-[#0b141a]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }} />

              {/* Content */}
              <div className="relative z-10 space-y-1">
              {/* Pinned Messages Section */}
              {pinnedMessages.length > 0 && (
                <PinnedMessages
                  messages={pinnedMessages}
                  onUnpin={handleUnpinMessage}
                />
              )}

              {loading ? (
                <div className="space-y-2 py-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] ${i % 2 === 0 ? 'bg-gray-700' : 'bg-emerald-600/60'} rounded-2xl px-3 py-2 animate-pulse`}>
                        <div className={`h-4 rounded w-24 mb-2 ${i % 2 === 0 ? 'bg-gray-600' : 'bg-emerald-400/50'}`} />
                        <div className={`h-3 rounded w-16 ${i % 2 === 0 ? 'bg-gray-600' : 'bg-emerald-400/30'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-gray-300 font-medium mb-1">
                    {emptyStateMessage.primary}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {emptyStateMessage.secondary}
                  </p>
                </div>
              ) : (
                <>
                  {filteredMessages.map((message, index) => {
                    const previousMessage = index > 0 ? filteredMessages[index - 1] : null;
                    const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

                    return (
                      <div key={message.id}>
                        {/* Date Separator - WhatsApp Style */}
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-3">
                            <span className="px-3 py-1 text-[11px] font-medium text-gray-300 bg-gray-700/90 rounded-lg shadow-sm">
                              {getDateLabel(new Date(message.created_at))}
                            </span>
                          </div>
                        )}

                        {/* Message Card with Swipe Gestures */}
                        <SwipeableMessageCard
                          isOwn={message.sender_id === user?.id}
                          onEdit={() => handleEditMessage(message)}
                          onDelete={() => handleDeleteMessage(message.id)}
                        >
                          <MessageCard
                            message={message}
                            onEdit={handleEditMessage}
                            onDelete={handleDeleteMessage}
                            onMarkRead={() => {}}
                            onTogglePin={handleTogglePin}
                            onForward={handleForwardMessage}
                            isOwn={message.sender_id === user?.id}
                            currentUserId={user?.id || ''}
                            onReply={handleReply}
                            showReplyButton={true}
                          />
                        </SwipeableMessageCard>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <TypingIndicator
                      userName="Partner"
                      userColor="#34D399"
                    />
                  )}

                  {/* Scroll anchor for auto-scroll */}
                  <div ref={messagesEndRef} />
                </>
              )}

              </div> {/* Close Content div */}
            </div>

            {/* Message Input - WhatsApp Style */}
            <div className="flex-shrink-0 px-2 py-2 bg-[#f0f2f5] bg-[#202c33]">
              <div className="flex items-center gap-2">
                {/* Message Input with Emoji Inside */}
                <div className="flex-1 flex items-center bg-[#2a3942] rounded-3xl shadow-sm relative">
                  {/* Emoji Button - Inside Input */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={toggleEmojiPicker}
                      className="p-2.5 hover:bg-gray-700/50 rounded-full transition-colors ml-1"
                    >
                      <Smile className="w-5 h-5 text-gray-400" />
                    </button>
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={closeEmojiPicker} />
                        <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-2xl shadow-xl p-3 grid grid-cols-6 gap-1 z-20 min-w-[240px] border border-gray-700">
                          {EMOJIS.map((emoji, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleEmojiClick(emoji)}
                              className="w-9 h-9 flex items-center justify-center hover:bg-gray-700 rounded-lg text-xl transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Text Input */}
                  {currentSpace && (
                    <MentionInput
                      value={messageInput}
                      onChange={handleMessageInputChange}
                      onSubmit={handleSubmitMessage}
                      spaceId={currentSpace.id}
                      placeholder="Message"
                      disabled={isSending}
                      showToolbar={false}
                      className="flex-1 text-[15px] bg-transparent border-0"
                    />
                  )}

                  {/* Attachment Button - Inside Input on right */}
                  <button
                    type="button"
                    onClick={handleFileClick}
                    className="p-2.5 hover:bg-gray-700/50 rounded-full transition-colors mr-1 flex-shrink-0"
                  >
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Voice/Send Button - Pill Shaped */}
                {messageInput.trim() ? (
                  <button
                    type="button"
                    onClick={handleSubmitMessage}
                    disabled={isSending}
                    className="h-11 px-5 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors shadow-md flex-shrink-0"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                    className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors shadow-md flex-shrink-0 ${
                      showVoiceRecorder
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-emerald-500 hover:bg-emerald-600'
                    }`}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Voice Recorder */}
              {showVoiceRecorder && (
                <div className="mt-2 p-3 bg-gray-800 rounded-2xl shadow-sm">
                  <VoiceRecorder
                    onSendVoice={handleSendVoice}
                    onCancel={() => setShowVoiceRecorder(false)}
                  />
                </div>
              )}

              {/* Hidden File Inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            </div>
          </div>

          {/* Mobile Conversation Sidebar Drawer */}
          {showConversationSidebar && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setShowConversationSidebar(false)}
              />

              {/* Drawer - Narrower and more transparent */}
              <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden">
                <ConversationSidebar
                  conversations={conversations}
                  activeConversationId={conversationId || undefined}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={() => setShowNewConversationModal(true)}
                  onDeleteConversation={handleDeleteConversation}
                  onRenameConversation={handleRenameConversationFromSidebar}
                  onClose={() => setShowConversationSidebar(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>
      </PageErrorBoundary>

      {/* Edit Message Modal (only for editing) */}
      {currentSpace && editingMessage && (
        <NewMessageModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleCreateMessage}
          editMessage={editingMessage}
          spaceId={currentSpace.id}
          conversationId={conversationId}
        />
      )}

      <DeleteMessageModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, messageId: '', isOwnMessage: false })}
        onConfirm={handleConfirmDelete}
        isOwnMessage={confirmDialog.isOwnMessage}
      />

      {/* New Conversation Modal */}
      {currentSpace && (
        <NewConversationModal
          isOpen={showNewConversationModal}
          onClose={() => setShowNewConversationModal(false)}
          onCreate={handleCreateConversation}
          spaceId={currentSpace.id}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          isOpen={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setForwardingMessage(null);
          }}
          onForward={handleForward}
          conversations={conversations}
          messagePreview={forwardingMessage.content}
        />
      )}

      {/* Thread View Modal */}
      {selectedThread && conversationId && currentSpace && user && (
        <ThreadView
          parentMessage={selectedThread}
          conversationId={conversationId}
          spaceId={currentSpace.id}
          currentUserId={user.id}
          partnerName="Partner"
          partnerColor="#34D399"
          onClose={handleCloseThread}
        />
      )}
    </FeatureLayout>
  );
}
