'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Search, Plus, Users, Mail, Clock, MessageSquare } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { MessageCard } from '@/components/messages/MessageCard';
import { NewMessageModal } from '@/components/messages/NewMessageModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { messagesService, Message, CreateMessageInput } from '@/lib/services/messages-service';

export default function MessagesPage() {
  const { currentSpace } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const conversationId = 'default'; // In a real app, this would be dynamic

  const [stats, setStats] = useState({
    conversations: 0,
    unread: 0,
    today: 0,
    total: 0,
  });

  useEffect(() => {
    loadMessages();
  }, [currentSpace.id]);

  useEffect(() => {
    let filtered = messages;

    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMessages(filtered);
  }, [messages, searchQuery]);

  async function loadMessages() {
    try {
      setLoading(true);
      const [messagesData, statsData] = await Promise.all([
        messagesService.getMessages(conversationId),
        messagesService.getMessageStats(currentSpace.id),
      ]);
      setMessages(messagesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMessage(messageData: CreateMessageInput) {
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
  }

  async function handleDeleteMessage(messageId: string) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await messagesService.deleteMessage(messageId);
      loadMessages();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }

  async function handleMarkRead(messageId: string) {
    try {
      await messagesService.markAsRead(messageId);
      loadMessages();
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  function handleEditMessage(message: Message) {
    setEditingMessage(message);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingMessage(null);
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Messages' }]}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-messages flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-messages bg-clip-text text-transparent">
                  Messages
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Stay connected with your partner
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Message
            </button>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Conversations</h3>
                <div className="w-12 h-12 bg-gradient-messages rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.conversations}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Unread</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.unread}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Today's Messages</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total</h3>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Messages List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Conversation ({filteredMessages.length})
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading messages...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No messages yet</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {searchQuery ? 'Try a different search' : 'Start the conversation!'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Send Message
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onMarkRead={handleMarkRead}
                    isOwn={message.sender_id === currentSpace.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New/Edit Message Modal */}
      <NewMessageModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleCreateMessage}
        editMessage={editingMessage}
        spaceId={currentSpace.id}
        conversationId={conversationId}
      />
    </FeatureLayout>
  );
}
