/**
 * useDashboardMode — Toggles between traditional and AI dashboard views.
 *
 * Persists in localStorage so the user's choice survives refresh.
 * Only allows 'ai' mode when the user has AI access (feature flag + subscription tier).
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCanAccessAI } from '@/lib/hooks/useCanAccessAI';

export type DashboardMode = 'traditional' | 'ai';

const STORAGE_KEY = 'rowan_dashboard_mode';

export function useDashboardMode() {
  const { canAccess: hasAIAccess } = useCanAccessAI();
  const [mode, setMode] = useState<DashboardMode>('traditional');
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ai' && hasAIAccess) {
      setMode('ai');
    }
    setMounted(true);
  }, [hasAIAccess]);

  // If access is revoked (e.g. downgrade), revert to traditional
  useEffect(() => {
    if (mounted && !hasAIAccess && mode === 'ai') {
      setMode('traditional');
      localStorage.setItem(STORAGE_KEY, 'traditional');
    }
  }, [mounted, hasAIAccess, mode]);

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
