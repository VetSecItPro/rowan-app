'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CreateMessageInput, Message } from '@/lib/services/messages-service';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (message: CreateMessageInput) => void;
  editMessage?: Message | null;
  spaceId: string;
  conversationId: string;
}

export function NewMessageModal({ isOpen, onClose, onSave, editMessage, spaceId, conversationId }: NewMessageModalProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (editMessage) {
      setContent(editMessage.content);
    } else {
      setContent('');
    }
  }, [editMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      space_id: spaceId,
      conversation_id: conversationId,
      content,
    });
    setContent('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editMessage ? 'Edit Message' : 'New Message'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message *
            </label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              rows={6}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg"
            >
              {editMessage ? 'Save Changes' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
