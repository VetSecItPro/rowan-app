'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Calendar, Check, Plus, ListTodo } from 'lucide-react';
import { simplifyIngredients, SimplifiedIngredient } from '@/lib/utils/ingredient-simplifier';
import { shoppingService } from '@/lib/services/shopping-service';
import { tasksService } from '@/lib/services/tasks-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

interface ShoppingListPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: (string | { name?: string; amount?: string; unit?: string })[];
  recipeName: string;
  spaceId: string;
  onSuccess?: () => void;
}

export function ShoppingListPreviewModal({
  isOpen,
  onClose,
  ingredients,
  recipeName,
  spaceId,
  onSuccess,
}: ShoppingListPreviewModalProps) {
  const { user } = useAuth();
  const [simplifiedItems, setSimplifiedItems] = useState<SimplifiedIngredient[]>([]);
  const [listName, setListName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [createTask, setCreateTask] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Process ingredients when modal opens
  useEffect(() => {
    if (isOpen && ingredients.length > 0) {
      const simplified = simplifyIngredients(ingredients);
      setSimplifiedItems(simplified);
      setListName(`${recipeName} Shopping`);
      setScheduledDate('');
      setCreateTask(true);
    }
  }, [isOpen, ingredients, recipeName]);

  const toggleItem = (index: number) => {
    setSimplifiedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAll = () => {
    setSimplifiedItems(prev => prev.map(item => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    setSimplifiedItems(prev => prev.map(item => ({ ...item, selected: false })));
  };

  const selectedCount = simplifiedItems.filter(item => item.selected).length;

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      toast.error('Please select at least one item');
      return;
    }

    if (!listName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the shopping list
      const list = await shoppingService.createList({
        space_id: spaceId,
        title: listName.trim(),
        description: `Ingredients for ${recipeName}`,
        status: 'active',
      });

      // Add selected items to the list
      const selectedItems = simplifiedItems.filter(item => item.selected);
      for (const item of selectedItems) {
        await shoppingService.createItem({
          list_id: list.id,
          name: item.simplified,
          quantity: 1,
        });
      }

      // Create task if scheduled date is set and createTask is enabled
      if (scheduledDate && createTask && user) {
        const dueDate = new Date(scheduledDate);
        dueDate.setHours(12, 0, 0, 0); // Set to noon

        await tasksService.createTask({
          space_id: spaceId,
          title: `🛒 ${listName.trim()}`,
          description: `Shopping trip for ${recipeName}.\n\n${selectedCount} items to buy.`,
          status: 'pending',
          priority: 'medium',
          due_date: dueDate.toISOString(),
          category: 'Shopping',
          created_by: user.id,
          assigned_to: null,
          calendar_sync: false,
          quick_note: null,
          tags: null,
        });

        toast.success('Shopping list and task created!', {
          description: `Added ${selectedCount} items and scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
        });
      } else {
        toast.success('Shopping list created!', {
          description: `Added ${selectedCount} items to "${listName}"`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating shopping list:', error);
      toast.error('Failed to create shopping list');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footerContent = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedCount === 0}
        className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-full transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="hidden sm:inline">Creating...</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>Add ({selectedCount})</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add to Shopping List - ${recipeName}`}
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-emerald-600 to-green-600"
      footer={footerContent}
    >
      <div className="space-y-4">
          {/* List Name */}
          <div className="flex-shrink-0 mb-4">
            <label htmlFor="listName" className="block text-sm font-medium mb-2 text-gray-300">
              List Name
            </label>
            <input
              type="text"
              id="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., Weekend Shopping"
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white"
            />
          </div>

          {/* Schedule Date */}
          <div className="flex-shrink-0 mb-4">
            <label htmlFor="scheduleDate" className="block text-sm font-medium mb-2 text-gray-300">
              <Calendar className="w-4 h-4 inline mr-1.5" />
              Schedule Shopping Trip (Optional)
            </label>
            <input
              type="date"
              id="scheduleDate"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white"
            />
          </div>

          {/* Create Task Checkbox - Only show if date is set */}
          {scheduledDate && (
            <div className="flex-shrink-0 mb-4 flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-800 rounded-xl">
              <input
                type="checkbox"
                id="createTask"
                checked={createTask}
                onChange={(e) => setCreateTask(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-600 ring-offset-gray-800 bg-gray-700 border-gray-600"
              />
              <label htmlFor="createTask" className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <ListTodo className="w-4 h-4 text-blue-600" />
                <span>Add to Tasks as reminder</span>
              </label>
            </div>
          )}

          {/* Items Section - Grows to fill remaining space */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">
                Items ({selectedCount}/{simplifiedItems.length} selected)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-900/30 rounded-full hover:bg-emerald-900/50 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-2.5 py-1 text-xs font-medium text-gray-300 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Items List - Scrollable, fills remaining space */}
            <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
              {simplifiedItems.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleItem(index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    item.selected
                      ? 'bg-emerald-900/20 border border-emerald-700'
                      : 'bg-gray-700/50 border border-transparent opacity-60'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      item.selected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-600'
                    }`}
                  >
                    {item.selected && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${
                      item.selected
                        ? 'text-white'
                        : 'text-gray-400 line-through'
                    }`}>
                      {item.simplified}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {item.original}
                    </p>
                  </div>
                </button>
              ))}

            {simplifiedItems.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No ingredients to add</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
