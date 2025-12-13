'use client';

import { useState } from 'react';
import { X, Send, Search } from 'lucide-react';
import { Conversation } from '@/lib/services/messages-service';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForward: (conversationIds: string[]) => Promise<void>;
  conversations: Conversation[];
  messagePreview: string;
}

export function ForwardMessageModal({
  isOpen,
  onClose,
  onForward,
  conversations,
  messagePreview,
}: ForwardMessageModalProps) {
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  if (!isOpen) return null;

  const handleToggleConversation = (conversationId: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const handleForward = async () => {
    if (selectedConversations.size === 0) return;

    setIsForwarding(true);
    try {
      await onForward(Array.from(selectedConversations));
      setSelectedConversations(new Set());
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Failed to forward message:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return conv.title?.toLowerCase().includes(query);
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-2xl">
            <h2 className="text-xl font-semibold text-white">
              Forward Message
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Message Preview */}
          <div className="px-6 pt-6">
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {messagePreview}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="px-6 pb-4 max-h-80 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                No conversations found
              </p>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleToggleConversation(conversation.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedConversations.has(conversation.id)
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                        : 'border-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedConversations.has(conversation.id)
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedConversations.has(conversation.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {conversation.title || 'Untitled Conversation'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {conversation.conversation_type}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedConversations.size} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleForward}
                disabled={selectedConversations.size === 0 || isForwarding}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white rounded-lg transition-all font-medium disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-500/25"
              >
                <Send className="w-4 h-4" />
                {isForwarding ? 'Forwarding...' : 'Forward'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
