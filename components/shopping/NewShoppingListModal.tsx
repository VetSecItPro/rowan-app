'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CreateListInput, ShoppingList } from '@/lib/services/shopping-service';

interface NewShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (list: CreateListInput) => void;
  editList?: ShoppingList | null;
  spaceId: string;
}

export function NewShoppingListModal({ isOpen, onClose, onSave, editList, spaceId }: NewShoppingListModalProps) {
  const [formData, setFormData] = useState<CreateListInput>({
    space_id: spaceId,
    title: '',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    if (editList) {
      setFormData({
        space_id: spaceId,
        title: editList.title,
        description: editList.description || '',
        status: editList.status,
      });
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        status: 'active',
      });
    }
  }, [editList, spaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editList ? 'Edit Shopping List' : 'New Shopping List'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg">
              {editList ? 'Save Changes' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
