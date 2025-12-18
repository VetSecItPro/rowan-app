'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MessageCircle, Search, Mail, Clock, MessageSquare, Smile, Image as ImageIcon, Paperclip, TrendingUp, X, CalendarClock } from 'lucide-react';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { MessageCard } from '@/components/messages/MessageCard';
import { NewMessageModal } from '@/components/messages/NewMessageModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
import { getUserProgress } from '@/lib/services/user-progress-service';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, messageId: '' });
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
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);

  const [stats, setStats] = useState({
    thisWeek: 0,
    unread: 0,
    today: 0,
    total: 0,
  });

  // Use search results if searching, otherwise show current conversation messages
  const filteredMessages = useMemo(() => {
    if (searchQuery && searchResults.length > 0) {
      return searchResults;
    }
    if (searchQuery && !isSearching && searchResults.length === 0) {
      return []; // Show empty state when search has no results
    }
    return messages;
  }, [messages, searchQuery, searchResults, isSearching]);

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

      const [messagesData, statsData, userProgressResult, pinnedData, conversationsData] = await Promise.all([
        messagesService.getMessages(defaultConversation.id),
        messagesService.getMessageStats(currentSpace.id),
        getUserProgress(user.id),
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

        await messagesService.updateMessage(editingMessage.id, messageData);
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
  }, [editingMessage]);

  // Memoize handleDeleteMessage callback
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    setConfirmDialog({ isOpen: true, messageId });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const messageId = confirmDialog.messageId;
    setConfirmDialog({ isOpen: false, messageId: '' });

    // Optimistic update - remove from UI immediately
    setMessages(prev => prev.filter(message => message.id !== messageId));

    try {
      await messagesService.deleteMessage(messageId);
    } catch (error) {
      logger.error('Failed to delete message:', error, { component: 'page', action: 'service_call' });
      // Revert optimistic update on error
      loadMessages();
    }
  }, [confirmDialog, loadMessages]);

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
    const tempId = `temp-${Date.now()}-${Math.random()}`;
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

  // Wrapper for form submission
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitMessage();
  }, [handleSubmitMessage]);

  // Memoize handleEmojiClick callback
  const handleEmojiClick = useCallback((emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // Memoize handleSearchChange callback with debounced backend search
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearchTyping(true);
    setTimeout(() => setIsSearchTyping(false), 300);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Clear search results if query is empty
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce search - wait 500ms after user stops typing
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      if (!currentSpace) return;

      try {
        const results = await messagesService.searchMessages(currentSpace.id, query);
        setSearchResults(results);
      } catch (error) {
        logger.error('Search failed:', error, { component: 'page', action: 'service_call' });
        toast.error('Search failed. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [currentSpace]);

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

  // Memoize handleImageClick callback
  const handleImageClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  // Memoize handleFileClick callback
  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Memoize handleImageChange callback
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  }, []);

  // Memoize handleFileChange callback
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  }, []);

  // Memoize empty state message
  const emptyStateMessage = useMemo(() => {
    if (searchQuery) {
      return {
        primary: 'No messages found',
        secondary: 'Try a different search'
      };
    }
    return {
      primary: 'No messages yet',
      secondary: 'Start the conversation below!'
    };
  }, [searchQuery]);


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
  }, [currentSpace, handleSelectConversation]);

  // Handle sending voice message
  const handleSendVoice = useCallback(async (audioBlob: Blob, duration: number) => {
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
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Messages' }]}>
      <PageErrorBoundary>
        <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-messages flex items-center justify-center">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-messages bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
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


          {/* Stats Dashboard */}
          <CollapsibleStatsGrid
            icon={MessageCircle}
            title="Messages Stats"
            summary={`${stats.unread} unread • ${stats.today} today`}
            iconGradient="bg-gradient-messages"
            gridClassName="stats-grid-mobile gap-3 sm:gap-6"
          >
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Today</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
                {stats.today > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <MessageSquare className="w-3 h-3" />
                    <span className="text-xs font-medium">Active</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">This Week</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-messages rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
                {stats.thisWeek > 0 && (
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">Recent</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Unread</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.unread}</p>
                {stats.unread > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Mail className="w-3 h-3" />
                    <span className="text-xs font-medium">New!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">All Time</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <MessageCircle className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleStatsGrid>


          {/* Conversations and Chat Interface */}
          <div className="flex gap-4 h-chat-container min-h-[500px]">
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

            {/* Chat Interface */}
            <div className="flex-1 bg-gradient-to-br from-white/80 via-emerald-50/40 to-green-50/60 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-800/90 backdrop-blur-2xl border border-emerald-200/30 dark:border-gray-700/50 rounded-3xl overflow-visible flex flex-col h-full shadow-2xl shadow-emerald-500/10 dark:shadow-gray-900/50">
            {/* Chat Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-emerald-200/30 dark:border-gray-700 bg-gradient-to-r from-emerald-400/10 via-green-400/10 to-teal-400/10 dark:from-gray-800 dark:to-gray-900 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setShowConversationSidebar(true)}
                    className="md:hidden p-2 hover:bg-emerald-100/50 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 flex-shrink-0"
                    aria-label="Open conversations"
                  >
                    <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </button>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/50 dark:ring-gray-700 flex-shrink-0">
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      {editingConversationTitle ? (
                        <input
                          type="text"
                          value={conversationTitleInput}
                          onChange={(e) => setConversationTitleInput(e.target.value)}
                          onKeyDown={handleTitleKeyDown}
                          onBlur={handleSaveConversationTitle}
                          autoFocus
                          className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight bg-transparent border-b-2 border-emerald-500 outline-none max-w-[150px] sm:max-w-[200px]"
                        />
                      ) : (
                        <h2
                          className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                          onClick={handleEditConversationTitle}
                          title="Click to rename conversation"
                        >
                          {conversationTitle}
                        </h2>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                          Active now
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date Badge */}
                <span className="hidden sm:inline-flex px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-300/50 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-full shadow-sm flex-shrink-0">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto overflow-x-visible px-4 sm:px-6 py-6 space-y-6 bg-gradient-to-b from-emerald-50/30 via-white/60 to-green-50/40 dark:from-gray-900/70 dark:via-gray-900/80 dark:to-gray-800/70 backdrop-blur-sm relative">
              {/* Subtle Chat Pattern Background with Glassmorphism */}
              <div className="absolute inset-0 opacity-30 dark:opacity-15">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/40 via-transparent to-green-100/30 dark:from-gray-800/30 dark:to-gray-700/20"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(55,65,81,0.15),transparent_50%)]"></div>
              </div>

              {/* Content */}
              <div className="relative z-10 space-y-6">
              {/* Pinned Messages Section */}
              {pinnedMessages.length > 0 && (
                <PinnedMessages
                  messages={pinnedMessages}
                  onUnpin={handleUnpinMessage}
                />
              )}

              {loading ? (
                <div className="space-y-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] ${i % 2 === 0 ? 'bg-white/80 dark:bg-gray-700/80 shadow-lg' : 'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 shadow-emerald-200/30'} rounded-3xl p-5 backdrop-blur-sm animate-pulse border ${i % 2 === 0 ? 'border-gray-200/50 dark:border-gray-600/50' : 'border-emerald-200/30 dark:border-emerald-700/30'}`}>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full w-32 mb-3" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <MessageCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-lg font-medium mb-2">
                    {emptyStateMessage.primary}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
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
                        {/* Date Separator */}
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-8">
                            <div className="flex-grow border-t border-emerald-200/40 dark:border-gray-600/50"></div>
                            <span className="px-5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-full shadow-sm border border-emerald-200/30 dark:border-emerald-700/30 backdrop-blur-sm">
                              {getDateLabel(new Date(message.created_at))}
                            </span>
                            <div className="flex-grow border-t border-emerald-200/40 dark:border-gray-600/50"></div>
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

            {/* Message Input */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-emerald-200/30 dark:border-gray-700 bg-gradient-to-r from-emerald-50/50 via-white to-green-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 backdrop-blur-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Message Input - Left */}
                {currentSpace && (
                  <MentionInput
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    onSubmit={handleSubmitMessage}
                    spaceId={currentSpace.id}
                    placeholder="Send message (use @ to mention)"
                    disabled={isSending}
                    className="flex-1 text-sm sm:text-base rounded-full"
                  />
                )}

                {/* Right side buttons - Emoji, Image, File, Send */}
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {/* Emoji Picker Button */}
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={toggleEmojiPicker}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    {/* Tooltip */}
                    <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Add emoji
                    </div>

                    {/* Emoji Picker Popup - Glassmorphism */}
                    {showEmojiPicker && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={closeEmojiPicker}
                        />
                        <div className="absolute bottom-full mb-2 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl backdrop-saturate-150 border border-white/50 dark:border-gray-600/50 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-3 sm:p-4 grid grid-cols-5 sm:grid-cols-6 gap-1 sm:gap-1.5 z-20 min-w-[220px] sm:min-w-[280px] ring-1 ring-black/5 dark:ring-white/5">
                          {EMOJIS.map((emoji, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleEmojiClick(emoji)}
                              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-white/60 dark:hover:bg-gray-600/60 rounded-xl text-xl sm:text-2xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer hover:shadow-md"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Image Attachment Button */}
                  <div className="relative group hidden sm:block">
                    <button
                      type="button"
                      onClick={handleImageClick}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Attach image
                    </div>
                  </div>

                  {/* File Attachment Button */}
                  <div className="relative group hidden sm:block">
                    <button
                      type="button"
                      onClick={handleFileClick}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Attach file
                    </div>
                  </div>

                  {/* Schedule Message Button */}
                  <div className="relative group hidden sm:block">
                    <button
                      type="button"
                      onClick={() => setShowSchedulePicker(!showSchedulePicker)}
                      className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                        scheduledTime
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <CalendarClock className={`w-4 h-4 sm:w-5 sm:h-5 ${scheduledTime ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {scheduledTime ? `Scheduled: ${format(scheduledTime, 'MMM d, h:mm a')}` : 'Schedule message'}
                    </div>

                    {/* Schedule Picker Popup - Glassmorphism */}
                    {showSchedulePicker && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowSchedulePicker(false)}
                        />
                        <div className="absolute bottom-full mb-2 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl backdrop-saturate-150 border border-white/50 dark:border-gray-600/50 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-4 z-20 min-w-[280px] ring-1 ring-black/5 dark:ring-white/5">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <CalendarClock className="w-4 h-4 text-blue-500" />
                            Schedule Message
                          </h4>

                          {/* Quick Schedule Options */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {[
                              { label: 'In 1 hour', hours: 1 },
                              { label: 'In 3 hours', hours: 3 },
                              { label: 'Tomorrow 9am', preset: 'tomorrow9' },
                              { label: 'Tomorrow 6pm', preset: 'tomorrow18' },
                            ].map((option) => (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() => {
                                  const now = new Date();
                                  let newTime: Date;
                                  if (option.hours) {
                                    newTime = new Date(now.getTime() + option.hours * 60 * 60 * 1000);
                                  } else if (option.preset === 'tomorrow9') {
                                    newTime = new Date(now);
                                    newTime.setDate(newTime.getDate() + 1);
                                    newTime.setHours(9, 0, 0, 0);
                                  } else {
                                    newTime = new Date(now);
                                    newTime.setDate(newTime.getDate() + 1);
                                    newTime.setHours(18, 0, 0, 0);
                                  }
                                  setScheduledTime(newTime);
                                  setShowSchedulePicker(false);
                                  toast.success(`Message scheduled for ${format(newTime, 'MMM d, h:mm a')}`);
                                }}
                                className="px-3 py-2 text-xs font-medium bg-white/60 dark:bg-gray-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-300 dark:hover:border-blue-600"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>

                          {/* Custom Date/Time */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              Custom date & time
                            </label>
                            <input
                              type="datetime-local"
                              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                              onChange={(e) => {
                                if (e.target.value) {
                                  const newTime = new Date(e.target.value);
                                  setScheduledTime(newTime);
                                  setShowSchedulePicker(false);
                                  toast.success(`Message scheduled for ${format(newTime, 'MMM d, h:mm a')}`);
                                }
                              }}
                              className="w-full px-3 py-2 text-sm bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white"
                            />
                          </div>

                          {/* Clear Schedule */}
                          {scheduledTime && (
                            <button
                              type="button"
                              onClick={() => {
                                setScheduledTime(null);
                                setShowSchedulePicker(false);
                                toast.info('Schedule cleared');
                              }}
                              className="w-full mt-3 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              Clear schedule
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Voice Message Button */}
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                        showVoiceRecorder
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                    {/* Tooltip */}
                    <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {showVoiceRecorder ? 'Close recorder' : 'Voice message'}
                    </div>
                  </div>

                  {/* Send Button with Right-Pointing Arrow */}
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={handleSubmitMessage}
                      disabled={isSending || !messageInput.trim()}
                      style={{ cursor: messageInput.trim() && !isSending ? 'pointer' : 'not-allowed' }}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg transform ${
                        isSending
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500 scale-95 animate-pulse'
                          : messageInput.trim()
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 hover:scale-110 hover:shadow-xl active:scale-95 hover:-translate-y-1'
                          : 'bg-gray-300 dark:bg-gray-600 opacity-50'
                      } ring-2 ring-white/50 dark:ring-gray-700`}
                    >
                      {isSending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      )}
                    </button>
                    {/* Tooltip */}
                    {messageInput.trim() && !isSending && (
                      <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-lg">
                        Send message
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Voice Recorder */}
              {showVoiceRecorder && (
                <div className="mt-3 p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-xl border border-white/40 dark:border-gray-600/40 shadow-lg">
                  <VoiceRecorder
                    onSendVoice={handleSendVoice}
                    onCancel={() => setShowVoiceRecorder(false)}
                  />
                </div>
              )}

              {/* Scheduled Message Indicator */}
              {scheduledTime && (
                <div className="mt-3 flex items-center justify-between px-4 py-2.5 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm rounded-xl border border-blue-200/50 dark:border-blue-700/30">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Message will be sent: {format(scheduledTime, 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduledTime(null);
                      toast.info('Schedule cleared');
                    }}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors"
                    aria-label="Clear schedule"
                  >
                    <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
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

              {/* Drawer */}
              <div className="fixed inset-y-0 left-0 w-80 z-50 md:hidden">
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, messageId: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
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
