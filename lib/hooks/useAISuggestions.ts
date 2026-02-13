/**
 * useAISuggestions — Fetches and manages proactive AI suggestions
 *
 * Polls the suggestions endpoint every 5 minutes.
 * Supports dismissing suggestions (persisted in sessionStorage).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AISuggestion } from '@/lib/services/ai/suggestion-service';

const DISMISSED_KEY = 'rowan_dismissed_suggestions';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface UseAISuggestionsReturn {
  suggestions: AISuggestion[];
  isLoading: boolean;
  dismiss: (id: string) => void;
}

function getDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // sessionStorage unavailable
  }
}

export function useAISuggestions(spaceId: string | undefined): UseAISuggestionsReturn {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Load dismissed from sessionStorage on mount
  useEffect(() => {
    setDismissed(getDismissed());
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!spaceId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/suggestions?spaceId=${spaceId}`);
      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch {
      // Silently fail — suggestions are non-critical
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  // Initial fetch (delayed to avoid competing with page-load API calls) + polling
  useEffect(() => {
    const delayTimer = setTimeout(fetchSuggestions, 1000);
    const interval = setInterval(fetchSuggestions, POLL_INTERVAL);
    return () => {
      clearTimeout(delayTimer);
      clearInterval(interval);
    };
  }, [fetchSuggestions]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  // Filter out dismissed suggestions
  const visible = suggestions.filter((s) => !dismissed.has(s.id));

  return { suggestions: visible, isLoading, dismiss };
}
