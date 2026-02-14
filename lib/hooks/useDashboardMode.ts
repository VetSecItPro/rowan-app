/**
 * useDashboardMode — Toggles between traditional and AI dashboard views.
 *
 * Persists in localStorage so the user's choice survives refresh.
 * Only allows 'ai' mode when the user has AI access (feature flag + subscription tier).
 */

'use client';

import { useState, useCallback } from 'react';
import { useCanAccessAI } from '@/lib/hooks/useCanAccessAI';

export type DashboardMode = 'traditional' | 'ai';

const STORAGE_KEY = 'rowan_dashboard_mode';

/** Manages the dashboard display mode (standard vs AI-enhanced) with localStorage persistence */
export function useDashboardMode() {
  const { canAccess: hasAIAccess, isLoading: aiLoading } = useCanAccessAI();

  // Hydrate from localStorage via lazy initializer (avoids setState in effect)
  const [mode, setMode] = useState<DashboardMode>(() => {
    if (typeof window === 'undefined') return 'traditional';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'ai' ? 'ai' : 'traditional';
    } catch {
      return 'traditional';
    }
  });
  const [mounted] = useState(() => typeof window !== 'undefined');

  // If access is revoked (e.g. downgrade), revert to traditional.
  // Uses React "adjusting state based on props" pattern during render
  // (https://react.dev/learn/you-might-not-need-an-effect).
  // Only check after AI access state has loaded to avoid premature revert.
  if (mounted && !aiLoading && !hasAIAccess && mode === 'ai') {
    setMode('traditional');
    try {
      localStorage.setItem(STORAGE_KEY, 'traditional');
    } catch {
      // localStorage may be unavailable
    }
  }

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'traditional' ? 'ai' : 'traditional';
      if (next === 'ai' && !hasAIAccess) return prev;
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, [hasAIAccess]);

  const setDashboardMode = useCallback((newMode: DashboardMode) => {
    if (newMode === 'ai' && !hasAIAccess) return;
    localStorage.setItem(STORAGE_KEY, newMode);
    setMode(newMode);
  }, [hasAIAccess]);

  return { mode, toggleMode, setDashboardMode, mounted };
}
