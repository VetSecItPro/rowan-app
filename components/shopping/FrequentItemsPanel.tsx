'use client';

import { useState, useEffect } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { shoppingService } from '@/lib/services/shopping-service';
import { getCategoryIcon } from '@/lib/constants/shopping-categories';
import { Tooltip } from '@/components/ui/Tooltip';
import { logger } from '@/lib/logger';

interface FrequentItem {
  name: string;
  count: number;
  category: string;
}

interface FrequentItemsPanelProps {
  spaceId: string;
  onAddItem: (name: string, category: string) => void;
}

export function FrequentItemsPanel({ spaceId, onAddItem }: FrequentItemsPanelProps) {
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    loadFrequentItems();
  }, [spaceId]);

  const loadFrequentItems = async () => {
    try {
      setLoading(true);
      const items = await shoppingService.getFrequentItems(spaceId, 12);
      setFrequentItems(items);
    } catch (error) {
      logger.error('Failed to load frequent items:', error, { component: 'FrequentItemsPanel', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading suggestions...</span>
        </div>
      </div>
    );
  }

  if (frequentItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Add</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Your frequently bought items</p>
          </div>
        </div>
        <Tooltip content={isExpanded ? 'Collapse' : 'Expand'} delay={0}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-lg transition-colors"
            aria-label={isExpanded ? 'Collapse frequent items' : 'Expand frequent items'}
          >
            {isExpanded ? (
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>
        </Tooltip>
      </div>

      {isExpanded && (
        <div className="flex flex-wrap gap-2 sm:gap-2.5">
          {frequentItems.map((item, index) => (
            <Tooltip key={`${item.name}-${index}`} content={`Added ${item.count}x recently`} delay={0}>
              <button
                onClick={() => onAddItem(item.name, item.category)}
                className="group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 rounded-full hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:shadow-sm"
              >
                <span className="text-base sm:text-lg flex-shrink-0">{getCategoryIcon(item.category as any)}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[120px] sm:max-w-none truncate">
                  {item.name}
                </span>
                {/* Purchased count badge */}
                <div className="w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {item.count}
                </div>
              </button>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
