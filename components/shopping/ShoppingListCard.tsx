'use client';

import { ShoppingCart, MoreVertical, Check, Plus } from 'lucide-react';
import { ShoppingList } from '@/lib/services/shopping-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';

interface ShoppingListCardProps {
  list: ShoppingList;
  onEdit: (list: ShoppingList) => void;
  onDelete: (listId: string) => void;
  onToggleItem?: (itemId: string, checked: boolean) => void;
  onCompleteList?: (listId: string) => void;
}

export function ShoppingListCard({ list, onEdit, onDelete, onToggleItem, onCompleteList }: ShoppingListCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const totalItems = list.items?.length || 0;
  const checkedItems = list.items?.filter(item => item.checked).length || 0;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
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
            <div className="w-10 h-10 bg-gradient-shopping rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {list.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {checkedItems} of {totalItems} items
              </p>
            </div>
          </div>

          {list.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {list.description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-shopping transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Items Preview */}
          {list.items && list.items.length > 0 && (
            <div className="space-y-2">
              {(isExpanded ? list.items : list.items.slice(0, 3)).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleItem?.(item.id, !item.checked)}
                    aria-label={`Toggle item: ${item.name}`}
                    className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      item.checked
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {item.checked && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {item.name} {item.quantity > 1 && `(${item.quantity})`}
                  </span>
                </div>
              ))}
              {list.items.length > 3 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 pl-6 hover:underline"
                >
                  {isExpanded ? 'Show less' : `+${list.items.length - 3} more items`}
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
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onEdit(list);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  Edit List
                </button>
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

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          list.status === 'completed'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : list.status === 'active'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
        }`}>
          {list.status}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatTimestamp(list.created_at, 'MMM d, yyyy')}
        </span>
      </div>
    </div>
  );
}
