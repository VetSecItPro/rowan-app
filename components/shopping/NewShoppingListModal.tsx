'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { CreateListInput, ShoppingList } from '@/lib/services/shopping-service';

interface NewShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (list: CreateListInput & { store_name?: string; items?: { id?: string; name: string; quantity: number }[] }) => void;
  editList?: ShoppingList | null;
  spaceId: string;
}

export function NewShoppingListModal({ isOpen, onClose, onSave, editList, spaceId }: NewShoppingListModalProps) {
  const [formData, setFormData] = useState<CreateListInput & { store_name?: string }>({
    space_id: spaceId,
    title: '',
    description: '',
    store_name: '',
    status: 'active',
  });

  const [items, setItems] = useState<{ id?: string; name: string; quantity: number; checked: boolean }[]>([]);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    if (editList) {
      setFormData({
        space_id: spaceId,
        title: editList.title,
        description: editList.description || '',
        store_name: editList.store_name || '',
        status: editList.status,
      });
      setItems((editList.items || []).map(item => ({
        id: item.id, // Preserve existing item ID
        name: item.name,
        quantity: item.quantity,
        checked: item.checked,
      })));
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        store_name: '',
        status: 'active',
      });
      setItems([]);
    }
  }, [editList, spaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      items: items.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })),
    });
    onClose();
    // Reset form
    setItems([]);
    setNewItemName('');
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setItems([...items, { name: newItemName, quantity: 1, checked: false }]);
      setNewItemName('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleToggleItem = (index: number) => {
    setItems(items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editList ? 'Edit Shopping List' : 'New Shopping List'}
          </h2>
          <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Type a Title"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Store</label>
            <input
              type="text"
              value={formData.store_name || ''}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              placeholder="Type your store"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Type a Description"
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white resize-none placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Items</label>

            {/* Add Item Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                placeholder="Add an item..."
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => handleToggleItem(index)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        item.checked
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {item.checked && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 shimmer-shopping text-white rounded-lg hover:opacity-90 transition-all shadow-lg font-medium">
              {editList ? 'Save Changes' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
