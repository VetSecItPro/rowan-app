'use client';

import { useState } from 'react';
import { X, MessageCircle, Users, Radio } from 'lucide-react';
import { CreateConversationInput } from '@/lib/services/messages-service';
import { logger } from '@/lib/logger';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (conversation: CreateConversationInput) => Promise<void>;
  spaceId: string;
}

export function NewConversationModal({
  isOpen,
  onClose,
  onCreate,
  spaceId,
}: NewConversationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [conversationType, setConversationType] = useState<'direct' | 'group' | 'general'>('direct');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreate({
        space_id: spaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        conversation_type: conversationType,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setConversationType('direct');
      onClose();
    } catch (error) {
      logger.error('Failed to create conversation:', error, { component: 'NewConversationModal', action: 'component_action' });
    } finally {
      setIsCreating(false);
    }
  };

  const conversationTypes = [
    {
      value: 'direct' as const,
      label: 'Direct',
      description: 'One-on-one conversation',
      icon: MessageCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      value: 'group' as const,
      label: 'Group',
      description: 'Conversation with multiple people',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      value: 'general' as const,
      label: 'General',
      description: 'Space-wide announcements',
      icon: Radio,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-2xl">
            <h2 className="text-xl font-semibold text-white">
              New Conversation
            </h2>
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Conversation Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Conversation Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {conversationTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = conversationType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setConversationType(type.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `${type.bgColor} border-${type.value === 'direct' ? 'blue' : type.value === 'group' ? 'purple' : 'green'}-500`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${isSelected ? type.color : 'text-gray-400'}`} />
                      <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                        {type.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {type.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Conversation Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekend Plans, Family Chat"
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white placeholder-gray-400"
                required
                maxLength={100}
              />
            </div>

            {/* Description Input (Optional) */}
            {conversationType !== 'direct' && (
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this conversation..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                  maxLength={500}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isCreating}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white rounded-lg transition-all font-medium disabled:cursor-not-allowed shadow-lg shadow-green-500/25"
              >
                {isCreating ? 'Creating...' : 'Create Conversation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
