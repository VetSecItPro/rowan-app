'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MessageCircle, Search, Mail, Clock, MessageSquare, Smile, Image as ImageIcon, Paperclip, TrendingUp } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { MessageCard } from '@/components/messages/MessageCard';
import { NewMessageModal } from '@/components/messages/NewMessageModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ThreadView } from '@/components/messages/ThreadView';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { VoiceRecorder } from '@/components/messages/VoiceRecorder';
import GuidedMessageCreation from '@/components/guided/GuidedMessageCreation';
import { fileUploadService } from '@/lib/services/file-upload-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { messagesService, Message, MessageWithReplies, CreateMessageInput, TypingIndicator as TypingIndicatorType } from '@/lib/services/messages-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
  const { currentSpace, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, messageId: '' });
  const [selectedThread, setSelectedThread] = useState<MessageWithReplies | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorType[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const [stats, setStats] = useState({
    thisWeek: 0,
    unread: 0,
    today: 0,
    total: 0,
  });

  // Memoize filtered messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery) {
      return messages;
    }

    return messages.filter(m =>
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

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

      const [messagesData, statsData, userProgressResult] = await Promise.all([
        messagesService.getMessages(defaultConversation.id),
        messagesService.getMessageStats(currentSpace.id),
        getUserProgress(user.id),
      ]);
      setMessages(messagesData);
      setStats(statsData);

      // Check if user has completed the guided message flow
      const userProgress = userProgressResult.success ? userProgressResult.data : null;
      if (userProgress) {
        setHasCompletedGuide(userProgress.first_message_sent);
      }

      // Show guided flow if no messages exist, user hasn't completed the guide, AND user hasn't skipped it
      if (
        messagesData.length === 0 &&
        !userProgress?.first_message_sent &&
        !userProgress?.skipped_message_guide
      ) {
        setShowGuidedFlow(true);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
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
    if (!conversationId || !user) return;

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
        console.error('Failed to fetch typing users:', error);
      }
    }, 2000);

    // Initial fetch
    messagesService.getTypingUsers(conversationId, user.id)
      .then(setTypingUsers)
      .catch((error) => console.error('Failed to fetch typing users:', error));

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
          console.error('Failed to cleanup typing indicator:', error);
        });
      }
    };
  }, [conversationId, user]);

  // Memoize handleCreateMessage callback
  const handleCreateMessage = useCallback(async (messageData: CreateMessageInput) => {
    try {
      if (editingMessage) {
        await messagesService.updateMessage(editingMessage.id, messageData);
      } else {
        await messagesService.createMessage(messageData);
      }
      loadMessages();
      setEditingMessage(null);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }, [editingMessage, loadMessages]);

  // Memoize handleDeleteMessage callback
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    setConfirmDialog({ isOpen: true, messageId });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const messageId = confirmDialog.messageId;
    setConfirmDialog({ isOpen: false, messageId: '' });

    try {
      await messagesService.deleteMessage(messageId);
      loadMessages();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, [confirmDialog, loadMessages]);

  // Memoize handleMarkRead callback
  const handleMarkRead = useCallback(async (messageId: string) => {
    try {
      await messagesService.markAsRead(messageId);
      loadMessages();
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }, [loadMessages]);

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

  // Memoize handleSendMessage callback with optimistic UI
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending || !conversationId) return;
    if (!currentSpace || !user) return;

    // Remove typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    messagesService.removeTypingIndicator(conversationId, user.id).catch((error) => {
      console.error('Failed to remove typing indicator:', error);
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
      await messagesService.createMessage({
        space_id: currentSpace.id,
        conversation_id: conversationId,
        sender_id: user.id,
        content: optimisticMessage.content,
      });

      // Real-time subscription will add the server message,
      // so remove the temp message to avoid duplicates
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch (error) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error('Failed to send message:', error);
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

  // Memoize handleSearchChange callback
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Memoize handleMessageInputChange callback with typing indicator
  const handleMessageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    // Update typing indicator (throttled)
    if (conversationId && user) {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing indicator
      messagesService.updateTypingIndicator(conversationId, user.id).catch((error) => {
        console.error('Failed to update typing indicator:', error);
      });

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (conversationId && user) {
          messagesService.removeTypingIndicator(conversationId, user.id).catch((error) => {
            console.error('Failed to remove typing indicator:', error);
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

  const handleGuidedFlowComplete = useCallback(() => {
    setShowGuidedFlow(false);
    setHasCompletedGuide(true);
    loadMessages(); // Reload to show newly created message
  }, [loadMessages]);

  const handleGuidedFlowSkip = useCallback(async () => {
    setShowGuidedFlow(false);

    // Mark the guide as skipped in user progress
    if (user) {
      try {
        await markFlowSkipped(user.id, 'message_guide');
      } catch (error) {
        console.error('Failed to mark message guide as skipped:', error);
      }
    }
  }, [user]);

  // Handle opening thread view
  const handleReply = useCallback((message: Message | MessageWithReplies) => {
    setSelectedThread(message as MessageWithReplies);
  }, []);

  // Handle closing thread view
  const handleCloseThread = useCallback(() => {
    setSelectedThread(null);
  }, []);

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
      console.error('Failed to send voice message:', error);
      toast.error('Failed to send voice message');
      throw error;
    }
  }, [currentSpace, user, conversationId, scrollToBottom]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Messages' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-messages flex items-center justify-center">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-messages bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Stay connected with your partner
              </p>
            </div>
          </div>

          {/* Guided Creation - MOVED TO TOP */}
          {!loading && showGuidedFlow && (
            <GuidedMessageCreation
              onComplete={handleGuidedFlowComplete}
              onSkip={handleGuidedFlowSkip}
            />
          )}

          {/* Stats Dashboard - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="stats-grid-mobile gap-3 sm:gap-6">
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
          </div>
          )}

          {/* Search Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
          )}

          {/* Chat Interface - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col h-[400px] sm:h-[500px] md:h-[600px]">
            {/* Chat Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Conversation
                </h2>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] ${i % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-green-50 dark:bg-green-900/20'} rounded-2xl p-4 shadow-sm animate-pulse`}>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                    {emptyStateMessage.primary}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">
                    {emptyStateMessage.secondary}
                  </p>
                  {!searchQuery && !hasCompletedGuide && (
                    <button
                      onClick={() => setShowGuidedFlow(true)}
                      className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Try Guided Creation
                    </button>
                  )}
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
                          <div className="flex items-center justify-center my-6">
                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                            <span className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full">
                              {getDateLabel(new Date(message.created_at))}
                            </span>
                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                          </div>
                        )}

                        {/* Message Card */}
                        <MessageCard
                          message={message}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onMarkRead={handleMarkRead}
                          isOwn={message.sender_id === currentSpace?.id}
                          currentUserId={currentSpace?.id || ''}
                          onReply={handleReply}
                          showReplyButton={true}
                        />
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
            </div>

            {/* Message Input */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-2">
                {/* Message Input - Left */}
                <input
                  type="text"
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  placeholder="Send message"
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                />

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

                    {/* Emoji Picker Popup */}
                    {showEmojiPicker && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={closeEmojiPicker}
                        />
                        <div className="absolute bottom-full mb-2 right-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3 sm:p-4 grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 z-20 min-w-[200px] sm:min-w-[240px]">
                          {EMOJIS.map((emoji, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleEmojiClick(emoji)}
                              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xl sm:text-2xl transition-all hover:scale-110 cursor-pointer"
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
                      type="submit"
                      disabled={isSending || !messageInput.trim()}
                      style={{ cursor: messageInput.trim() && !isSending ? 'pointer' : 'not-allowed' }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                        isSending
                          ? 'bg-green-600 scale-95'
                          : messageInput.trim()
                          ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95'
                          : 'bg-purple-300 dark:bg-purple-400 opacity-60'
                      }`}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                    {/* Tooltip */}
                    {messageInput.trim() && (
                      <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Send message
                      </div>
                    )}
                  </div>
                </div>
              </form>

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
          )}
        </div>
      </div>

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
