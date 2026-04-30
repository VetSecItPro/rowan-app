'use client';

import { useState } from 'react';
import { Plus, type LucideIcon } from 'lucide-react';

export interface StarterSuggestion {
  /** Stable identifier so we can disable the button while it's creating */
  id: string;
  /** Visible label on the button */
  label: string;
  /** Optional one-liner shown under the label */
  hint?: string;
  /** Optional Lucide icon (defaults to Plus) */
  icon?: LucideIcon;
}

export type StarterTone = 'blue' | 'emerald' | 'orange' | 'indigo';

interface StarterSuggestionsProps {
  /** Heading shown above the suggestion buttons */
  heading?: string;
  suggestions: StarterSuggestion[];
  /** Async create callback. Resolve when the item is in the list. */
  onPick: (id: string) => Promise<void> | void;
  tone: StarterTone;
}

const TONE_CLASSES: Record<StarterTone, { border: string; bg: string; icon: string; hover: string }> = {
  blue: {
    border: 'border-blue-700/40',
    bg: 'bg-blue-900/10',
    icon: 'text-blue-400',
    hover: 'hover:bg-blue-900/30 hover:border-blue-600',
  },
  emerald: {
    border: 'border-emerald-700/40',
    bg: 'bg-emerald-900/10',
    icon: 'text-emerald-400',
    hover: 'hover:bg-emerald-900/30 hover:border-emerald-600',
  },
  orange: {
    border: 'border-orange-700/40',
    bg: 'bg-orange-900/10',
    icon: 'text-orange-400',
    hover: 'hover:bg-orange-900/30 hover:border-orange-600',
  },
  indigo: {
    border: 'border-indigo-700/40',
    bg: 'bg-indigo-900/10',
    icon: 'text-indigo-400',
    hover: 'hover:bg-indigo-900/30 hover:border-indigo-600',
  },
};

/**
 * Renders a small "Get started with:" panel under an EmptyState.
 *
 * WHY: New users staring at an empty page often bounce. Three one-click
 * starters get them from "blank canvas" to "first item created" in 2 clicks
 * (page load + click). The panel disappears as soon as the list has items
 * because the parent stops rendering the empty state.
 */
export function StarterSuggestions({
  heading = 'Get started with:',
  suggestions,
  onPick,
  tone,
}: StarterSuggestionsProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const t = TONE_CLASSES[tone];

  const handleClick = async (id: string) => {
    if (pendingId) return; // prevent double-clicks across all buttons
    setPendingId(id);
    try {
      await onPick(id);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mt-4 -mx-4 sm:mx-auto sm:max-w-md w-auto">
      <p className="text-xs font-medium text-gray-400 mb-2 text-center uppercase tracking-wide">
        {heading}
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => {
          const Icon = s.icon ?? Plus;
          const isPending = pendingId === s.id;
          const disabled = pendingId !== null;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleClick(s.id)}
              disabled={disabled}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${t.border} ${t.bg} ${t.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gray-900/60 flex items-center justify-center ${t.icon}`}>
                {isPending ? (
                  <div className={`w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin`} />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{s.label}</p>
                {s.hint && (
                  <p className="text-xs text-gray-400 truncate">{s.hint}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
