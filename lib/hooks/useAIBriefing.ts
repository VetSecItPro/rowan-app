/**
 * useAIBriefing — Fetches the morning briefing when available
 *
 * Only enabled between 6-11am and when the user has the setting on.
 * Dismissal is persisted in sessionStorage for the current session.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BriefingOutput } from '@/lib/services/ai/briefing-service';

const DISMISSED_KEY = 'rowan_briefing_dismissed';

function isMorningWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 11;
}

function isDismissedToday(): boolean {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const dismissedDate = JSON.parse(raw) as string;
    return dismissedDate === new Date().toISOString().split('T')[0];
  } catch {
    return false;
  }
}

interface UseAIBriefingReturn {
  briefing: BriefingOutput | null;
  isLoading: boolean;
  dismiss: () => void;
}

export function useAIBriefing(spaceId: string | undefined): UseAIBriefingReturn {
  const [briefing, setBriefing] = useState<BriefingOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(isDismissedToday());
  }, []);

  useEffect(() => {
    if (!spaceId || isDismissed || !isMorningWindow()) return;

    let cancelled = false;

    async function fetchBriefing() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/ai/briefing?spaceId=${spaceId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled && data.briefing) {
          setBriefing(data.briefing);
        }
      } catch {
        // Silently fail — briefing is non-critical
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchBriefing();
    return () => {
      cancelled = true;
    };
  }, [spaceId, isDismissed]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setBriefing(null);
    try {
      sessionStorage.setItem(
        DISMISSED_KEY,
        JSON.stringify(new Date().toISOString().split('T')[0])
      );
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  return {
    briefing: isDismissed ? null : briefing,
    isLoading,
    dismiss,
  };
}
