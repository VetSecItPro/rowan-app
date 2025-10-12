'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingBag, Check, X, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  is_purchased: boolean;
  notes?: string;
}

interface ShoppingList {
  id: string;
  name: string;
  description: string;
  creatorName: string;
  created_at: string;
  shared_at: string;
}

interface ShoppingData {
  list: ShoppingList;
  items: ShoppingItem[];
  itemsByCategory: Record<string, ShoppingItem[]>;
  stats: {
    totalItems: number;
    purchasedItems: number;
    categories: number;
  };
}

export default function PublicShoppingListPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ShoppingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Load shopping list data
  useEffect(() => {
    const loadShoppingList = async () => {
      try {
        const response = await fetch(`/api/shopping/share/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load shopping list');
        }

        if (result.success && result.data) {
          setData(result.data);
          // Expand all categories by default
          setExpandedCategories(new Set(Object.keys(result.data.itemsByCategory)));
        }
      } catch (err) {
        console.error('Load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shopping list');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadShoppingList();
    }
  }, [token]);

  // Toggle item purchased status
  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    if (!data) return;

    // Optimistically update UI
    const updatedItems = data.items.map((item) =>
      item.id === itemId ? { ...item, is_purchased: !currentStatus } : item
    );

    const updatedItemsByCategory: Record<string, ShoppingItem[]> = {};
    Object.keys(data.itemsByCategory).forEach((category) => {
      updatedItemsByCategory[category] = data.itemsByCategory[category].map((item) =>
        item.id === itemId ? { ...item, is_purchased: !currentStatus } : item
      );
    });

    setData({
      ...data,
      items: updatedItems,
      itemsByCategory: updatedItemsByCategory,
      stats: {
        ...data.stats,
        purchasedItems: !currentStatus
          ? data.stats.purchasedItems + 1
          : data.stats.purchasedItems - 1,
      },
    });

    // Send update to server
    try {
      const response = await fetch(`/api/shopping/share/${token}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          isPurchased: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }
    } catch (err) {
      console.error('Update error:', err);
      // Revert optimistic update on error
      setData(data);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading shopping list...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Shopping List Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This shopping list may have been removed or made private.'}
          </p>
        </div>
      </div>
    );
  }

  const progress = data.stats.totalItems > 0
    ? (data.stats.purchasedItems / data.stats.totalItems) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                {data.list.name}
              </h1>
              {data.list.description && (
                <p className="text-gray-600 dark:text-gray-400">{data.list.description}</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Shared by {data.list.creatorName} •{' '}
                {format(new Date(data.list.shared_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Progress: {data.stats.purchasedItems} / {data.stats.totalItems} items
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Shopping Items by Category */}
        <div className="space-y-4">
          {Object.entries(data.itemsByCategory).map(([category, items]) => {
            const isExpanded = expandedCategories.has(category);
            const categoryPurchased = items.filter((i) => i.is_purchased).length;
            const categoryTotal = items.length;

            return (
              <div
                key={category}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {category}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {categoryPurchased}/{categoryTotal}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-4 space-y-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleToggleItem(item.id, item.is_purchased)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all border-2 ${
                          item.is_purchased
                            ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                            : 'bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            item.is_purchased
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {item.is_purchased && <Check className="w-4 h-4 text-white" />}
                        </div>

                        {/* Item Info */}
                        <div className="flex-1 text-left min-w-0">
                          <p
                            className={`font-medium ${
                              item.is_purchased
                                ? 'text-gray-500 dark:text-gray-500 line-through'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </p>
                          {item.quantity && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.quantity}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by Rowan</p>
        </div>
      </div>
    </div>
  );
}
