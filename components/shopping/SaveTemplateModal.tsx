'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { ShoppingList } from '@/lib/services/shopping-service';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  list: ShoppingList;
}

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
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-xl sm:max-w-md sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Save as Template</h2>
          <button
            onClick={onClose}
            className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-4">
          <div>
            <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Groceries"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="template-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this template..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              💡 <strong>Tip:</strong> This template will save all {list.items?.length || 0} items from your current list, making it easy to reuse for future shopping trips.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex-1 px-4 py-2 bg-gradient-shopping text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        </form>
      </div>
    </div>
  );
}
