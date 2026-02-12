'use client';

import { MoreVertical, Check } from 'lucide-react';
import { ShoppingList } from '@/lib/services/shopping-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState, useMemo, memo } from 'react';
import { getCategoryIcon, getCategoryLabel } from '@/lib/constants/shopping-categories';
import type { ShoppingCategory } from '@/lib/constants/shopping-categories';
import { Tooltip } from '@/components/ui/Tooltip';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { useAuth } from '@/lib/contexts/auth-context';

interface ShoppingListCardProps {
  list: ShoppingList;
  onEdit: (list: ShoppingList) => void;
  onDelete: (listId: string) => void;
  onToggleItem?: (itemId: string, checked: boolean) => void;
  onCompleteList?: (listId: string) => void;
  onSaveAsTemplate?: (list: ShoppingList) => void;
  onScheduleTrip?: (list: ShoppingList) => void;
  onCreateTask?: (list: ShoppingList) => void;
  onUpdateQuantity?: (itemId: string, newQuantity: number) => void;
}

export const ShoppingListCard = memo(function ShoppingListCard({ list, onEdit, onDelete, onToggleItem, onCompleteList, onSaveAsTemplate, onScheduleTrip, onCreateTask, onUpdateQuantity }: ShoppingListCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});
  const { user: _user } = useAuth();

  const totalItems = list.items?.length || 0;
  const checkedItems = list.items?.filter(item => item.checked).length || 0;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  // Group items by category
  const itemsByCategory = useMemo(() => {
    if (!list.items) return {};

    const grouped: Record<string, typeof list.items> = {};
    list.items.forEach(item => {
      const category = item.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Sort categories
    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        return acc;
      }, {} as Record<string, typeof list.items>);
  }, [list]);

  // Handlers for editable quantity input
  const handleQuantityChange = (itemId: string, value: string) => {
    // Allow only numbers and empty string (for clearing)
    if (value === '' || /^\d+$/.test(value)) {
      setEditingQuantities(prev => ({ ...prev, [itemId]: value }));
    }
  };

  const handleQuantityBlur = (itemId: string) => {
    const editedValue = editingQuantities[itemId];
    if (editedValue !== undefined) {
      const numValue = parseInt(editedValue, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 200) {
        onUpdateQuantity?.(itemId, numValue);
      }
      // Clear editing state
      setEditingQuantities(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
    }
  };

  const handleQuantityKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Trigger blur to save
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 md:p-6 hover:shadow-md transition-colors group">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          {/* Mobile: Stack checkbox + progress vertically, then title. Desktop: All inline */}
          <div className="flex gap-3 sm:gap-4 mb-2">
            {/* Checkbox + Progress container - stacked on mobile */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 flex-shrink-0">
              <Tooltip content={list.status === 'completed' ? 'List completed' : 'Mark entire list as complete'} delay={0}>
                <button
                  onClick={() => onCompleteList?.(list.id)}
                  disabled={list.status === 'completed'}
                  aria-label={`Mark entire shopping list as ${list.status === 'completed' ? 'completed' : 'complete'}`}
                  className={`flex-shrink-0 w-6 h-6 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    list.status === 'completed'
                      ? 'bg-green-500 border-green-500 cursor-not-allowed'
                      : 'border-emerald-500 hover:border-emerald-400 hover:bg-emerald-900/20 cursor-pointer'
                  }`}
                >
                  {list.status === 'completed' && <Check className="w-4 h-4 text-white" />}
                </button>
              </Tooltip>

              {/* Circular Progress Ring - below checkbox on mobile */}
              <Tooltip content={`${checkedItems} of ${totalItems} items checked`} delay={0}>
                <div className="flex-shrink-0">
                  <CircularProgress
                    progress={progress}
                    size={44}
                    strokeWidth={4}
                    color="emerald"
                    showPercentage={true}
                  />
                </div>
              </Tooltip>
            </div>

            {/* Title and subtitle */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight">
                {list.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                {checkedItems} of {totalItems} items • {list.store_name || 'No store set'}
              </p>
            </div>
          </div>

          {list.description && (
            <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:ml-[76px] leading-relaxed">
              <span className="font-medium">Note:</span> {list.description}
            </p>
          )}

          {/* Items Preview - Grouped by Category */}
          {list.items && list.items.length > 0 && (
            <div className="space-y-3 mt-2 -mr-7 sm:mr-0">
              {Object.entries(itemsByCategory).slice(0, isExpanded ? undefined : 2).map(([category, items]) => (
                <div key={category} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-base sm:text-lg">{getCategoryIcon(category as ShoppingCategory)}</span>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {getCategoryLabel(category as ShoppingCategory)}
                    </span>
                  </div>
                  {items?.slice(0, isExpanded ? undefined : 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 ml-0 sm:ml-2 group/item">
                      {/* Left side: checkbox + item name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Tooltip content={item.checked ? 'Mark as not purchased' : 'Mark as purchased'} delay={0}>
                          <button
                            onClick={() => onToggleItem?.(item.id, !item.checked)}
                            aria-label={`Toggle item: ${item.name}`}
                            className={`flex-shrink-0 w-5 h-5 sm:w-4 sm:h-4 rounded border-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 ${
                              item.checked
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-600 hover:border-emerald-500'
                            }`}
                          >
                            {item.checked && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </Tooltip>
                        <span className={`text-xs sm:text-sm truncate ${item.checked ? 'line-through text-gray-400' : 'text-gray-300'}`}>
                          {item.name}
                        </span>
                      </div>

                      {/* Right side: Quantity Controls - pushed to right edge */}
                      {onUpdateQuantity && (
                        <div className="flex items-center gap-px flex-shrink-0">
                          <button
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, Number(item.quantity) - 1))}
                            disabled={Number(item.quantity) <= 1}
                            className="w-[18px] h-[18px] sm:w-5 sm:h-5 flex-shrink-0 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                            aria-label="Decrease quantity"
                          >
                            <span className="text-[9px] sm:text-xs font-bold text-gray-300">−</span>
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editingQuantities[item.id] ?? item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            onBlur={() => handleQuantityBlur(item.id)}
                            onKeyPress={(e) => handleQuantityKeyPress(e)}
                            className="w-[22px] h-[18px] sm:w-7 sm:h-5 text-[8px] sm:text-xs font-medium text-gray-300 text-center bg-gray-800 border border-gray-600/50 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Edit quantity"
                          />
                          <button
                            onClick={() => onUpdateQuantity(item.id, Math.min(200, Number(item.quantity) + 1))}
                            disabled={Number(item.quantity) >= 200}
                            className="w-[18px] h-[18px] sm:w-5 sm:h-5 flex-shrink-0 rounded bg-emerald-900/30 hover:bg-emerald-800/50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                            aria-label="Increase quantity"
                          >
                            <span className="text-[9px] sm:text-xs font-bold text-emerald-400">+</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {(Object.keys(itemsByCategory).length > 2 || list.items.length > 6) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-emerald-400 ml-1 sm:ml-2 hover:underline transition-opacity"
                >
                  {isExpanded ? 'Show less' : `+${list.items.length - 6} more items`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Shopping list options menu"
            className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onEdit(list);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded-t-lg transition-colors"
                >
                  Edit List
                </button>
                {onScheduleTrip && (
                  <button
                    onClick={() => {
                      onScheduleTrip(list);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-purple-400 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    📅 Schedule Shopping Trip
                  </button>
                )}
                {onCreateTask && (
                  <button
                    onClick={() => {
                      onCreateTask(list);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-blue-400 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    ✓ Create Task
                  </button>
                )}
                {onSaveAsTemplate && list.items && list.items.length > 0 && (
                  <button
                    onClick={() => {
                      onSaveAsTemplate(list);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-emerald-400 hover:bg-gray-700 transition-colors"
                  >
                    Save as Template
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete(list.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 rounded-b-lg transition-colors"
                >
                  Delete List
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer: Status, Store, Budget */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            list.status === 'completed'
              ? 'bg-green-900/30 text-green-300'
              : list.status === 'active'
              ? 'bg-blue-900/30 text-blue-300'
              : 'bg-gray-900/30 text-gray-300'
          }`}>
            {list.status}
          </span>
          {list.store_name && (
            <Tooltip content={`Shopping at ${list.store_name}`}>
              <span className="px-2 py-1 text-xs bg-emerald-900/30 text-emerald-300 rounded-full truncate max-w-[120px]">
                🏪 {list.store_name}
              </span>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-3">
          {list.budget && (
            <Tooltip content={`Budget: $${list.budget.toFixed(2)}`}>
              <span className="text-xs text-gray-400">
                💰 ${list.estimated_total?.toFixed(2) || '0.00'} / ${list.budget.toFixed(2)}
              </span>
            </Tooltip>
          )}
          <span className="text-xs text-gray-400">
            {formatTimestamp(list.created_at, 'MMM d, yyyy')}
          </span>
        </div>
      </div>
    </div>
  );
});
