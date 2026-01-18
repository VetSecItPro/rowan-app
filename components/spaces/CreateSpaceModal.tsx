'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { Modal } from '@/components/ui/Modal';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated: (spaceId: string, spaceName: string) => void;
}

export function CreateSpaceModal({ isOpen, onClose, onSpaceCreated }: CreateSpaceModalProps) {
  const [spaceName, setSpaceName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSpaceName('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spaceName.trim()) {
      toast.error('Please enter a space name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/spaces/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: spaceName.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create space');
      }

      toast.success('Space created successfully');
      onSpaceCreated(result.data.id, result.data.name);
      onClose();
    } catch (error) {
      logger.error('Error creating space:', error, { component: 'CreateSpaceModal', action: 'component_action' });
      toast.error(error instanceof Error ? error.message : 'Failed to create space');
    } finally {
      setLoading(false);
    }
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="create-space-form"
        disabled={loading}
        className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-full transition-all shadow-lg shadow-teal-500/25 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Space'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Space"
      maxWidth="md"
      headerGradient="bg-gradient-to-r from-teal-600 to-emerald-600"
      footer={footerContent}
    >
      <form id="create-space-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
            Space Name *
          </label>
          <input
            type="text"
            required
            value={spaceName}
            id="field-1"
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="e.g., Our Family, The Johnsons, Home Sweet Home"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white"
            disabled={loading}
            maxLength={100}
          />
          <p className="mt-2 text-sm text-gray-400">
            This is the name of your shared space where you&apos;ll manage tasks, events, and more together.
          </p>
        </div>
      </form>
    </Modal>
  );
}
