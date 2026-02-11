/**
 * useDashboardMode — Toggles between traditional and AI dashboard views.
 *
 * Persists in localStorage so the user's choice survives refresh.
 * Only allows 'ai' mode when AI_COMPANION feature flag is enabled.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { FEATURE_FLAGS } from '@/lib/constants/feature-flags';

export type DashboardMode = 'traditional' | 'ai';

const STORAGE_KEY = 'rowan_dashboard_mode';

export function useDashboardMode() {
  const [mode, setMode] = useState<DashboardMode>('traditional');
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ai' && FEATURE_FLAGS.AI_COMPANION) {
      setMode('ai');
    }
    setMounted(true);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'traditional' ? 'ai' : 'traditional';
      // Only persist 'ai' if flag is enabled
      if (next === 'ai' && !FEATURE_FLAGS.AI_COMPANION) return prev;
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setDashboardMode = useCallback((newMode: DashboardMode) => {
    if (newMode === 'ai' && !FEATURE_FLAGS.AI_COMPANION) return;
    localStorage.setItem(STORAGE_KEY, newMode);
    setMode(newMode);
  }, []);

  return { mode, toggleMode, setDashboardMode, mounted };
}
