'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { Send, Search } from 'lucide-react';
import { Conversation } from '@/lib/services/messages-service';
import { logger } from '@/lib/logger';
import { Modal } from '@/components/ui/Modal';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForward: (conversationIds: string[]) => Promise<void>;
  conversations: Conversation[];
  messagePreview: string;
}

/** Renders a modal for forwarding a message to another conversation. */
export function ForwardMessageModal({
  isOpen,
  onClose,
  onForward,
  conversations,
  messagePreview,
}: ForwardMessageModalProps) {
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [isForwarding, setIsForwarding] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!debouncedSearchQuery) return conversations;
    const query = debouncedSearchQuery.toLowerCase();
    return conversations.filter((conv) => conv.title?.toLowerCase().includes(query));
  }, [conversations, debouncedSearchQuery]);

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
      logger.error('Failed to forward message:', error, { component: 'ForwardMessageModal', action: 'component_action' });
    } finally {
      setIsForwarding(false);
    }
  };

  const footerContent = (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-400">
        {selectedConversations.size} selected
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleForward}
          disabled={selectedConversations.size === 0 || isForwarding}
          className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-600 text-white rounded-full transition-all font-medium disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-500/25"
        >
          <Send className="w-4 h-4" />
          {isForwarding ? 'Forwarding...' : 'Forward'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Forward Message"
      maxWidth="md"
      headerGradient="bg-gradient-to-r from-green-500 to-emerald-600"
      footer={footerContent}
    >
      <div className="space-y-4">
        {/* Message Preview */}
        <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-300 line-clamp-3">
            {messagePreview}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
          />
        </div>

        {/* Conversations List */}
        <div className="max-h-60 overflow-y-auto -mx-1 px-1">
          {filteredConversations.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
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
                      ? 'bg-green-900/20 border-2 border-green-500'
                      : 'border-2 border-transparent hover:bg-gray-700'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedConversations.has(conversation.id)
                      ? 'bg-green-600 border-green-600'
                      : 'border-gray-600'
                  }`}>
                    {selectedConversations.has(conversation.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">
                      {conversation.title || 'Untitled Conversation'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {conversation.conversation_type}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
