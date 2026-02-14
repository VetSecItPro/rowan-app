'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { ShoppingList } from '@/lib/services/shopping-service';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';
import { showError } from '@/lib/utils/toast';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  list: ShoppingList;
}

/** Renders a modal for saving a shopping list as a reusable template. */
export function SaveTemplateModal({ isOpen, onClose, onSave, list }: SaveTemplateModalProps) {
  const [name, setName] = useState(list.title);
  const [description, setDescription] = useState(list.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      await onSave(name, description);
      onClose();
      // Reset form
      setName(list.title);
      setDescription(list.description || '');
    } catch (error) {
      logger.error('Failed to save template:', error, { component: 'SaveTemplateModal', action: 'component_action' });
      showError('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const footerContent = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 sm:px-6 py-2.5 border border-gray-600 text-gray-300 rounded-full hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="save-template-form"
        disabled={isSaving || !name.trim()}
        className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
      >
        {isSaving ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Template
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save as Template"
      maxWidth="md"
      headerGradient="bg-gradient-to-r from-emerald-500 to-emerald-600"
      footer={footerContent}
    >
      <form id="save-template-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="template-name" className="block text-sm font-medium text-gray-300 mb-2">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Weekly Groceries"
            required
            className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-900 text-white"
          />
        </div>

        <div>
          <label htmlFor="template-description" className="block text-sm font-medium text-gray-300 mb-2">
            Description (Optional)
          </label>
          <input
            id="template-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this template..."
            className="w-full px-4 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-900 text-white"
          />
        </div>

        <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
          <p className="text-sm text-emerald-300">
            💡 <strong>Tip:</strong> This template will save all {list.items?.length || 0} items from your current list, making it easy to reuse for future shopping trips.
          </p>
        </div>
      </form>
    </Modal>
  );
}
