'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, GripVertical, UserPlus } from 'lucide-react';
import { CreateListInput, ShoppingList, shoppingService } from '@/lib/services/shopping-service';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { createClient } from '@/lib/supabase/client';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';

interface NewShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (list: CreateListInput & { store_name?: string; budget?: number; items?: { id?: string; name: string; quantity: number; assigned_to?: string }[] }) => void;
  editList?: ShoppingList | null;
  spaceId: string;
}

export function NewShoppingListModal({ isOpen, onClose, onSave, editList, spaceId }: NewShoppingListModalProps) {
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
  const [isReorderMode, setIsReorderMode] = useState(false);
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
              display_name
            )
          `)
          .eq('space_id', spaceId)
          .order('joined_at', { ascending: true });

        if (!error && data) {
          setSpaceMembers(data.map((member: any) => ({
            user_id: member.user_id,
            display_name: member.users?.display_name,
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
    setIsReorderMode(false);
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

  const handleReorderItems = (reorderedItems: typeof items) => {
    setItems(reorderedItems);
  };

  const handleAssignItem = (index: number, userId: string | undefined) => {
    setItems(items.map((item, i) =>
      i === index ? { ...item, assigned_to: userId } : item
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-xl sm:max-w-4xl lg:max-w-5xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-between px-4 sm:px-6 py-5 border-b border-emerald-600">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {editList ? 'Edit Shopping List' : 'New Shopping List'}
          </h2>
          <button onClick={onClose} aria-label="Close modal" className="btn-touch w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-emerald-600 transition-all active-press hover-lift shimmer-emerald">
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Type a Title"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Store and Budget - Side by side on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">Store</label>
              <input
                type="text"
                value={formData.store_name || ''}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                placeholder="Type your store"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label htmlFor="field-budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Budget (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget || ''}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="field-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">Description</label>
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
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Items</label>
              <div className="flex items-center gap-2">
                {spaceMembers.length > 0 && items.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Assign all to:</span>
                    <select
                      value={defaultAssignee}
                      onChange={(e) => handleAssignAllItems(e.target.value || undefined)}
                      className="text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg px-2 py-1.5 text-emerald-700 dark:text-emerald-300 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">No one</option>
                      {spaceMembers.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.display_name || member.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsReorderMode(!isReorderMode)}
                    className="btn-touch flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors active-press hover-lift"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                    {isReorderMode ? 'Done Reordering' : 'Reorder Items'}
                  </button>
                )}
              </div>
            </div>

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
                className="btn-touch px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 active-press hover-lift shimmer-emerald"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                {isReorderMode ? (
                  /* Reorder Mode with Drag Handles */
                  items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        className="btn-touch cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded active-press hover-lift shimmer-emerald"
                        onMouseDown={(e) => {
                          const startY = e.clientY;
                          const startIndex = index;
                          const onMouseMove = (e: MouseEvent) => {
                            const deltaY = e.clientY - startY;
                            const newIndex = Math.round(startIndex + deltaY / 40);
                            if (newIndex >= 0 && newIndex < items.length && newIndex !== startIndex) {
                              const newItems = [...items];
                              const [removed] = newItems.splice(startIndex, 1);
                              newItems.splice(newIndex, 0, removed);
                              handleReorderItems(newItems);
                            }
                          };
                          const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                          };
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                        }}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {item.name}
                      </span>
                    </div>
                  ))
                ) : (
                  /* Normal Mode with Assignment */
                  items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => handleToggleItem(index)}
                        className={`btn-touch flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all active-press ${
                          item.checked
                            ? 'bg-green-500 border-green-500 shimmer-emerald'
                            : 'border-gray-300 dark:border-gray-600 hover-lift'
                        }`}
                      >
                        {item.checked && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item.name}
                      </span>

                      {/* Assignment Dropdown */}
                      {spaceMembers.length > 0 && (
                        <div className="flex items-center gap-2">
                          {item.assigned_to && (
                            <UserAvatar
                              name={spaceMembers.find(m => m.user_id === item.assigned_to)?.display_name || 'User'}
                              size="sm"
                              colorTheme="emerald"
                            />
                          )}
                          <select
                            value={item.assigned_to || ''}
                            onChange={(e) => handleAssignItem(index, e.target.value || undefined)}
                            className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="">Unassigned</option>
                            {spaceMembers.map((member) => (
                              <option key={member.user_id} value={member.user_id}>
                                {member.display_name || member.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="btn-touch p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors active-press hover-lift shimmer-red"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <SecondaryButton
              type="button"
              onClick={onClose}
              feature="shopping"
            >
              Cancel
            </SecondaryButton>
            <CTAButton
              type="submit"
              feature="shopping"
              icon={editList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {editList ? 'Save Changes' : 'Create List'}
            </CTAButton>
          </div>
        </form>
      </div>
    </div>
  );
}
