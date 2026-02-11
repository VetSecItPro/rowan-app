/**
 * SuggestionCards — Horizontal scrollable proactive suggestion cards
 *
 * Displays AI-generated suggestions with feature-colored borders,
 * priority badges, and action/dismiss buttons. Tapping the action
 * sends the suggestion's message to the chat.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import type { AISuggestion, SuggestionPriority } from '@/lib/services/ai/suggestion-service';

const FEATURE_BORDER_COLORS: Record<string, string> = {
  tasks: 'border-blue-500/40',
  budget: 'border-green-500/40',
  goals: 'border-indigo-500/40',
  chores: 'border-amber-500/40',
  meals: 'border-orange-500/40',
  calendar: 'border-purple-500/40',
  shopping: 'border-emerald-500/40',
};

const PRIORITY_CONFIG: Record<
  SuggestionPriority,
  { icon: typeof AlertTriangle; label: string; color: string }
> = {
  high: { icon: AlertTriangle, label: 'Urgent', color: 'text-red-400 bg-red-500/10' },
  medium: { icon: Sparkles, label: 'Suggested', color: 'text-amber-400 bg-amber-500/10' },
  low: { icon: Info, label: 'Tip', color: 'text-blue-400 bg-blue-500/10' },
};

interface SuggestionCardsProps {
  suggestions: AISuggestion[];
  onAction: (message: string) => void;
  onDismiss: (id: string) => void;
}

export default function SuggestionCards({
  suggestions,
  onAction,
  onDismiss,
}: SuggestionCardsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1 -mx-1">
      <AnimatePresence initial={false}>
        {suggestions.map((suggestion) => {
          const borderColor = FEATURE_BORDER_COLORS[suggestion.feature] ?? 'border-gray-600';
          const priority = PRIORITY_CONFIG[suggestion.priority];
          const PriorityIcon = priority.icon;

          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`flex-shrink-0 w-[220px] rounded-xl border ${borderColor} bg-gray-800/60 p-3 flex flex-col gap-2`}
            >
              {/* Header: priority badge + dismiss */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${priority.color}`}
                >
                  <PriorityIcon className="w-3 h-3" />
                  {priority.label}
                </span>
                <button
                  onClick={() => onDismiss(suggestion.id)}
                  className="p-0.5 rounded hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label="Dismiss suggestion"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Content */}
              <div>
                <p className="text-xs font-medium text-white leading-tight">
                  {suggestion.title}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                  {suggestion.description}
                </p>
              </div>

              {/* Action button */}
              <button
                onClick={() => onAction(suggestion.actionMessage)}
                className="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors mt-auto"
              >
                Ask Rowan
                <ArrowRight className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
