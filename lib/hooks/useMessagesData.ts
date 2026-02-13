import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { messagesService, Message, TypingIndicator as TypingIndicatorType, Conversation, MessageStats } from '@/lib/services/messages-service';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// =============================================
// TYPES
// =============================================

export interface MessagesDataReturn {
  // Auth/space context
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];

  // Loading state
  loading: boolean;

  // Messages data
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  filteredMessages: Message[];

  // Stats
  stats: MessageStats;
  setStats: React.Dispatch<React.SetStateAction<MessageStats>>;

  // Conversations
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  currentConversation: Conversation | undefined;
  conversationTitle: string;

  // Input state
  messageInput: string;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;

  // Pinned messages
  pinnedMessages: Message[];
  setPinnedMessages: React.Dispatch<React.SetStateAction<Message[]>>;

  // Typing
  typingUsers: TypingIndicatorType[];
  typingTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;

  // Refs
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;

  // Computed helpers
  getDateLabel: (date: Date) => string;
  shouldShowDateSeparator: (currentMessage: Message, previousMessage: Message | null) => boolean;
  emptyStateMessage: { primary: string; secondary: string };

  // Actions
  loadMessages: () => Promise<void>;
  scrollToBottom: () => void;
}

// =============================================
// HOOK
// =============================================

export function useMessagesData(): MessagesDataReturn {
  const { currentSpace, user } = useAuthWithSpaces();

  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorType[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [stats, setStats] = useState<MessageStats>({
    thisWeek: 0,
    unread: 0,
    today: 0,
    total: 0,
    conversations: 0,
  });

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filtered messages (currently identity — kept for future filtering)
  const filteredMessages = messages;

  // Computed: current conversation
  const currentConversation = useMemo(
    () => conversations.find(conv => conv.id === conversationId),
    [conversations, conversationId]
  );
  const conversationTitle = currentConversation?.title || 'Conversation';

  // Empty state message
  const emptyStateMessage = useMemo(() => ({
    primary: 'No messages yet',
    secondary: 'Start the conversation below!',
  }), []);

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

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const fetchedConversations = await messagesService.getConversations(currentSpace.id);

      let defaultConversation;
      if (fetchedConversations.length === 0) {
        defaultConversation = await messagesService.createConversation({
          space_id: currentSpace.id,
          title: 'General',
          participants: [],
        });
      } else {
        defaultConversation = fetchedConversations[0];
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

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) {
      return;
    }

    const channel = messagesService.subscribeToMessages(conversationId, {
      onInsert: (newMessage) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        if (newMessage.sender_id !== user.id) {
          toast.success('New message received', {
            description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
          });
        }

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

    const pollInterval = setInterval(async () => {
      try {
        const typingData = await messagesService.getTypingUsers(conversationId, user.id);
        setTypingUsers(typingData);
      } catch (error) {
        logger.error('Failed to fetch typing users:', error, { component: 'page', action: 'service_call' });
      }
    }, 2000);

    messagesService.getTypingUsers(conversationId, user.id)
      .then(setTypingUsers)
      .catch((error) => logger.error('Failed to fetch typing users', error, { component: 'page', action: 'service_call' }));

    return () => {
      clearInterval(pollInterval);
    };
  }, [conversationId, user]);

  // Cleanup typing indicator on unmount
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

  return {
    currentSpace,
    user,
    loading,
    messages,
    setMessages,
    filteredMessages,
    stats,
    setStats,
    conversations,
    setConversations,
    conversationId,
    setConversationId,
    currentConversation,
    conversationTitle,
    messageInput,
    setMessageInput,
    isSending,
    setIsSending,
    pinnedMessages,
    setPinnedMessages,
    typingUsers,
    typingTimeoutRef,
    imageInputRef,
    fileInputRef,
    messagesEndRef,
    getDateLabel,
    shouldShowDateSeparator,
    emptyStateMessage,
    loadMessages,
    scrollToBottom,
  };
}
