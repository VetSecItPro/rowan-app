'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { shoppingService } from '@/lib/services/shopping-service';
import { getCategoryIcon, type ShoppingCategory } from '@/lib/constants/shopping-categories';
import { Tooltip } from '@/components/ui/Tooltip';
import { logger } from '@/lib/logger';

interface FrequentItem {
  name: string;
  count: number;
  category: ShoppingCategory;
}

interface FrequentItemsPanelProps {
  spaceId: string;
  onAddItem: (name: string, category: string) => void;
}

export function FrequentItemsPanel({ spaceId, onAddItem }: FrequentItemsPanelProps) {
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const loadFrequentItems = useCallback(async () => {
    try {
      setLoading(true);
      const items = await shoppingService.getFrequentItems(spaceId, 12);
      setFrequentItems(items);
    } catch (error) {
      logger.error('Failed to load frequent items:', error, { component: 'FrequentItemsPanel', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadFrequentItems();
  }, [loadFrequentItems]);

  if (loading) {
    return (
      <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-6">
        <div className="flex items-center justify-center gap-2 text-emerald-400">
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
    <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Quick Add</h3>
            <p className="text-xs text-gray-400">Your frequently bought items</p>
          </div>
        </div>
        <Tooltip content={isExpanded ? 'Collapse' : 'Expand'} delay={0}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-emerald-800/50 rounded-lg transition-colors"
            aria-label={isExpanded ? 'Collapse frequent items' : 'Expand frequent items'}
          >
            {isExpanded ? (
              <X className="w-4 h-4 text-gray-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </Tooltip>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {frequentItems.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              onClick={() => onAddItem(item.name, item.category)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:border-emerald-500 hover:bg-emerald-900/20 transition-all text-left"
            >
              <span className="text-sm flex-shrink-0">{getCategoryIcon(item.category)}</span>
              <span className="text-xs font-medium text-gray-300 truncate flex-1">
                {item.name}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0">
                +{item.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
