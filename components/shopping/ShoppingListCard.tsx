'use client';

import { ShoppingCart, MoreVertical, Check, Plus } from 'lucide-react';
import { ShoppingList } from '@/lib/services/shopping-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState, useMemo } from 'react';
import { getCategoryIcon, getCategoryLabel } from '@/lib/constants/shopping-categories';
import { Tooltip } from '@/components/ui/Tooltip';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { UserAvatar } from '@/components/ui/UserAvatar';
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

export function ShoppingListCard({ list, onEdit, onDelete, onToggleItem, onCompleteList, onSaveAsTemplate, onScheduleTrip, onCreateTask, onUpdateQuantity }: ShoppingListCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

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
  }, [list.items]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <Tooltip content={list.status === 'completed' ? 'List completed' : 'Mark entire list as complete'} delay={0}>
              <button
                onClick={() => onCompleteList?.(list.id)}
                disabled={list.status === 'completed'}
                aria-label={`Mark entire shopping list as ${list.status === 'completed' ? 'completed' : 'complete'}`}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  list.status === 'completed'
                    ? 'bg-green-500 border-green-500 cursor-not-allowed'
                    : 'border-emerald-400 dark:border-emerald-500 hover:border-emerald-600 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer'
                }`}
              >
                {list.status === 'completed' && <Check className="w-4 h-4 text-white" />}
              </button>
            </Tooltip>

            {/* Circular Progress Ring */}
            <Tooltip content={`${checkedItems} of ${totalItems} items checked`} delay={0}>
              <div className="flex-shrink-0">
                <CircularProgress
                  progress={progress}
                  size={56}
                  strokeWidth={5}
                  color="emerald"
                  showPercentage={true}
                />
              </div>
            </Tooltip>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {list.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {checkedItems} of {totalItems} items • {list.store_name || 'No store set'}
              </p>
            </div>
          </div>

          {list.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 ml-[76px]">
              <span className="font-medium">Note:</span> {list.description}
            </p>
          )}

          {/* Items Preview - Grouped by Category */}
          {list.items && list.items.length > 0 && (
            <div className="space-y-3">
              {Object.entries(itemsByCategory).slice(0, isExpanded ? undefined : 2).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCategoryIcon(category as any)}</span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {getCategoryLabel(category as any)}
                    </span>
                  </div>
                  {items?.slice(0, isExpanded ? undefined : 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 ml-7 group/item">
                      <Tooltip content={item.checked ? 'Mark as not purchased' : 'Mark as purchased'} delay={0}>
                        <button
                          onClick={() => onToggleItem?.(item.id, !item.checked)}
                          aria-label={`Toggle item: ${item.name}`}
                          className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            item.checked
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500'
                          }`}
                        >
                          {item.checked && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </Tooltip>

                      {/* Item name and quantity controls grouped together */}
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {item.name}
                        </span>

                        {/* Quantity Controls - right next to item name */}
                        {onUpdateQuantity && (
                          <div className="flex items-center gap-0.5">
                            <Tooltip content="Decrease quantity" delay={0}>
                              <button
                                onClick={() => onUpdateQuantity(item.id, Math.max(1, Number(item.quantity) - 1))}
                                disabled={Number(item.quantity) <= 1}
                                className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                              >
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">−</span>
                              </button>
                            </Tooltip>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[1.25rem] text-center px-0.5">
                              {item.quantity}
                            </span>
                            <Tooltip content="Increase quantity" delay={0}>
                              <button
                                onClick={() => onUpdateQuantity(item.id, Number(item.quantity) + 1)}
                                className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 flex items-center justify-center transition-colors"
                                aria-label="Increase quantity"
                              >
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+</span>
                              </button>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {(Object.keys(itemsByCategory).length > 2 || list.items.length > 6) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 ml-7 hover:underline"
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onEdit(list);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  Edit List
                </button>
                {onScheduleTrip && (
                  <button
                    onClick={() => {
                      onScheduleTrip(list);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-purple-600 dark:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
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
                    className="w-full px-4 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
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
                    className="w-full px-4 py-2 text-left text-emerald-600 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Save as Template
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete(list.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
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
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : list.status === 'active'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
          }`}>
            {list.status}
          </span>
          {list.store_name && (
            <Tooltip content={`Shopping at ${list.store_name}`}>
              <span className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                🏪 {list.store_name}
              </span>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-3">
          {list.budget && (
            <Tooltip content={`Budget: $${list.budget.toFixed(2)}`}>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                💰 ${list.estimated_total?.toFixed(2) || '0.00'} / ${list.budget.toFixed(2)}
              </span>
            </Tooltip>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(list.created_at, 'MMM d, yyyy')}
          </span>
        </div>
      </div>
    </div>
  );
}
