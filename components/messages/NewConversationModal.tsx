'use client';

import { useState } from 'react';
import { MessageCircle, Users, Radio } from 'lucide-react';
import { CreateConversationInput } from '@/lib/services/messages-service';
import { logger } from '@/lib/logger';
import { Modal } from '@/components/ui/Modal';

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
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
    },
    {
      value: 'group' as const,
      label: 'Group',
      description: 'Conversation with multiple people',
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
    },
    {
      value: 'general' as const,
      label: 'General',
      description: 'Space-wide announcements',
      icon: Radio,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
    },
  ];

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2.5 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors font-medium"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="new-conversation-form"
        disabled={!title.trim() || isCreating}
        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 text-white rounded-full transition-all font-medium disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
      >
        {isCreating ? 'Creating...' : 'Create Conversation'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Conversation"
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-green-500 to-emerald-600"
      footer={footerContent}
    >
      <form id="new-conversation-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Conversation Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
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
                  className={`p-4 rounded-3xl border-2 transition-all text-left ${isSelected
                      ? `${type.bgColor} border-${type.value === 'direct' ? 'blue' : type.value === 'group' ? 'purple' : 'green'}-500`
                      : 'border-gray-700 hover:border-gray-600'
                    }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? type.color : 'text-gray-400'}`} />
                  <div className="font-medium text-white text-sm mb-1">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-400">
                    {type.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
            Conversation Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Weekend Plans, Family Chat"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
            required
            maxLength={100}
          />
        </div>

        {/* Description Input (Optional) */}
        {conversationType !== 'direct' && (
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this conversation..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400 resize-none"
              maxLength={500}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
