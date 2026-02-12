'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { shoppingService, type TemplateItemInput } from '@/lib/services/shopping-service';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

interface CreateCustomTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  spaceId: string;
}

export function CreateCustomTemplateModal({ isOpen, onClose, onSave, spaceId }: CreateCustomTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<TemplateItemInput[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setItems([...items, {
        name: newItemName.trim(),
        quantity: newItemQuantity,
        category: newItemCategory.trim() || undefined
      }]);
      setNewItemName('');
      setNewItemQuantity(1);
      setNewItemCategory('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) {
      alert('Please enter a template name and at least one item.');
      return;
    }

    try {
      setSaving(true);
      await shoppingService.createTemplate(spaceId, name.trim(), description.trim(), items);
      onSave();
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setItems([]);
    } catch (error) {
      logger.error('Failed to create custom template:', error, { component: 'CreateCustomTemplateModal', action: 'component_action' });
      alert('Failed to create template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setItems([]);
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemCategory('');
    onClose();
  };

  const footerContent = (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClose}
        className="px-4 sm:px-6 py-2.5 border border-gray-600 text-gray-300 rounded-full hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={!name.trim() || items.length === 0 || saving}
        className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
      >
        {saving ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Save Template
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Custom Template"
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-emerald-500 to-emerald-600"
      footer={footerContent}
    >
      <div className="space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Groceries"
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template"
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
            />
          </div>

          {/* Add Item Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Add Items
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                placeholder="Item name"
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-sm"
              />
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-sm text-center"
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!newItemName.trim()}
                className="px-4 py-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              placeholder="Category (optional)"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-sm"
            />
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Template Items ({items.length})
                </label>
                <span className="text-xs text-gray-400">Drag to reorder</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto bg-gray-900/50 rounded-lg p-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2 bg-gray-800 rounded-lg border border-gray-700 cursor-move transition-all ${
                      draggedIndex === index ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-white truncate">
                      {item.name}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                      x{item.quantity}
                    </span>
                    {item.category && (
                      <span className="text-xs text-emerald-400">
                        {item.category}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-red-500 hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              Add items above to build your template
            </div>
          )}
      </div>
    </Modal>
  );
}
