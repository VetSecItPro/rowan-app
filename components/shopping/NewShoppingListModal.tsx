'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, FileText } from 'lucide-react';
import { CreateListInput, ShoppingList, shoppingService } from '@/lib/services/shopping-service';
import { createClient } from '@/lib/supabase/client';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';
import { Dropdown } from '@/components/ui/Dropdown';

interface NewShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (list: CreateListInput & { store_name?: string; budget?: number; items?: { id?: string; name: string; quantity: number; assigned_to?: string }[] }) => void;
  editList?: ShoppingList | null;
  spaceId: string;
  onUseTemplate?: () => void;
}

export function NewShoppingListModal({ isOpen, onClose, onSave, editList, spaceId, onUseTemplate }: NewShoppingListModalProps) {
  const [formData, setFormData] = useState<CreateListInput & { store_name?: string; budget?: number }>({
    space_id: spaceId,
    title: '',
    description: '',
    store_name: '',
    budget: undefined,
    status: 'active',
  });

  const [items, setItems] = useState<{ id?: string; name: string; quantity: number; checked: boolean; assigned_to?: string }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [spaceMembers, setSpaceMembers] = useState<any[]>([]);
  const [defaultAssignee, setDefaultAssignee] = useState<string>('');

  useEffect(() => {
    if (editList) {
      setFormData({
        space_id: spaceId,
        title: editList.title,
        description: editList.description || '',
        store_name: editList.store_name || '',
        budget: editList.budget,
        status: editList.status,
      });
      setItems((editList.items || []).map(item => ({
        id: item.id, // Preserve existing item ID
        name: item.name,
        quantity: item.quantity,
        checked: item.checked,
        assigned_to: item.assigned_to,
      })));
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        store_name: '',
        budget: undefined,
        status: 'active',
      });
      setItems([]);
    }
  }, [editList, spaceId]);

  // Fetch space members
  useEffect(() => {
    const loadMembers = async () => {
      if (spaceId) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('space_members')
          .select(`
            user_id,
            role,
            joined_at,
            users:user_id (
              id,
              email,
              name
            )
          `)
          .eq('space_id', spaceId)
          .order('joined_at', { ascending: true });

        if (!error && data) {
          setSpaceMembers(data.map((member: any) => ({
            user_id: member.user_id,
            display_name: member.users?.name,
            email: member.users?.email,
            role: member.role,
          })));
        }
      }
    };
    loadMembers();
  }, [spaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      items: items.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, assigned_to: item.assigned_to })),
    });
    onClose();
    // Reset form
    setItems([]);
    setNewItemName('');
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setItems([...items, { name: newItemName, quantity: 1, checked: false, assigned_to: defaultAssignee || undefined }]);
      setNewItemName('');
    }
  };

  const handleAssignAllItems = (userId: string | undefined) => {
    setDefaultAssignee(userId || '');
    setItems(items.map(item => ({ ...item, assigned_to: userId })));
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleToggleItem = (index: number) => {
    setItems(items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    ));
  };

  // Helper functions for dropdown options
  const getAssignAllOptions = () => {
    const options = [{ value: '', label: 'No one' }];
    spaceMembers.forEach((member) => {
      options.push({
        value: member.user_id,
        label: member.display_name || member.email
      });
    });
    return options;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-800 sm:w-auto sm:rounded-xl sm:max-w-4xl lg:max-w-5xl sm:max-h-[90vh] overflow-hidden overscroll-contain shadow-2xl flex flex-col">
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-between px-4 sm:px-6 py-5 border-b border-emerald-600">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {editList ? 'Edit Shopping List' : 'New Shopping List'}
          </h2>
          <button onClick={onClose} aria-label="Close modal" className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all">
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-6">
          {/* Use Template Option - only show when creating new list */}
          {!editList && onUseTemplate && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onUseTemplate();
              }}
              className="w-full p-3 sm:p-4 border-2 border-dashed border-emerald-600 rounded-lg hover:border-emerald-400 hover:bg-emerald-900/20 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Use a Template
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Start with a pre-made list
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Title */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Type a Title"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500"
            />
          </div>

          {/* Store and Budget - Side by side on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-2" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">Store</label>
              <input
                type="text"
                value={formData.store_name || ''}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                placeholder="Type your store"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label htmlFor="field-budget" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Budget (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget || ''}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="field-3" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Type a Description"
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-300 cursor-pointer">Items</label>
              {spaceMembers.length > 0 && items.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">Assign all:</span>
                  <div className="w-32 sm:w-36">
                    <Dropdown
                      value={defaultAssignee}
                      onChange={(value) => handleAssignAllItems(value || undefined)}
                      options={getAssignAllOptions()}
                      placeholder="No one"
                      className="text-xs bg-emerald-900/20 border-emerald-700 text-emerald-300 font-medium focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Add Item Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                placeholder="Add an item..."
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-2 sm:px-5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors flex items-center gap-1.5 sm:gap-2 font-medium shadow-sm text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg border border-gray-700">
                    <button
                      type="button"
                      onClick={() => handleToggleItem(index)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.checked
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-600 hover:border-emerald-500'
                      }`}
                    >
                      {item.checked && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-300'}`}>
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-red-500 hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
            <SecondaryButton
              type="button"
              onClick={onClose}
              feature="shopping"
              className="rounded-full px-6"
            >
              Cancel
            </SecondaryButton>
            <CTAButton
              type="submit"
              feature="shopping"
              icon={editList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              className="rounded-full px-6"
            >
              {editList ? 'Save Changes' : 'Create Shopping List'}
            </CTAButton>
          </div>
        </form>
      </div>
    </div>
  );
}
