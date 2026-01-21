'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, FileText } from 'lucide-react';
import { CreateListInput, ShoppingList, shoppingService } from '@/lib/services/shopping-service';
import { Modal } from '@/components/ui/Modal';
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

type ShoppingListItemForm = { id?: string; name: string; quantity: number; checked: boolean; assigned_to?: string };
type SpaceMemberOption = { user_id: string; display_name?: string; email?: string; role?: string };
type SpaceMemberRow = { user_id: string; role?: string; joined_at?: string; users?: { id: string; email?: string; name?: string } };

const buildInitialFormData = (editList: ShoppingList | null | undefined, spaceId: string): CreateListInput & { store_name?: string; budget?: number } => {
  if (editList) {
    return {
      space_id: spaceId,
      title: editList.title,
      description: editList.description || '',
      store_name: editList.store_name || '',
      budget: editList.budget,
      status: editList.status,
    };
  }

  return {
    space_id: spaceId,
    title: '',
    description: '',
    store_name: '',
    budget: undefined,
    status: 'active',
  };
};

const buildInitialItems = (editList: ShoppingList | null | undefined): ShoppingListItemForm[] => {
  if (!editList) return [];
  return (editList.items || []).map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    checked: item.checked,
    assigned_to: item.assigned_to,
  }));
};

function ShoppingListForm({ isOpen, onClose, onSave, editList, spaceId, onUseTemplate }: NewShoppingListModalProps) {
  const [formData, setFormData] = useState<CreateListInput & { store_name?: string; budget?: number }>(() => buildInitialFormData(editList, spaceId));

  const [items, setItems] = useState<ShoppingListItemForm[]>(() => buildInitialItems(editList));
  const [newItemName, setNewItemName] = useState('');
  const [spaceMembers, setSpaceMembers] = useState<SpaceMemberOption[]>([]);
  const [defaultAssignee, setDefaultAssignee] = useState<string>('');

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
          setSpaceMembers((data as SpaceMemberRow[]).map((member) => ({
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
        label: member.display_name || member.email || 'Unknown'
      });
    });
    return options;
  };

  const footerContent = (
    <div className="flex items-center gap-3">
      <SecondaryButton
        type="button"
        onClick={onClose}
        feature="shopping"
        className="rounded-full px-4 sm:px-6"
      >
        Cancel
      </SecondaryButton>
      <CTAButton
        type="submit"
        form="new-shopping-list-form"
        feature="shopping"
        icon={editList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        className="rounded-full px-4 sm:px-6"
      >
        {editList ? 'Save Changes' : 'Create Shopping List'}
      </CTAButton>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editList ? 'Edit Shopping List' : 'New Shopping List'}
      maxWidth="4xl"
      headerGradient="bg-gradient-to-r from-emerald-500 to-emerald-600"
      footer={footerContent}
    >
      <form id="new-shopping-list-form" onSubmit={handleSubmit} className="space-y-6">
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

      </form>
    </Modal>
  );
}

export function NewShoppingListModal(props: NewShoppingListModalProps) {
  const { editList, isOpen, spaceId } = props;
  const formKey = `${editList?.id ?? 'new'}-${isOpen ? 'open' : 'closed'}-${spaceId}`;
  return <ShoppingListForm key={formKey} {...props} />;
}
