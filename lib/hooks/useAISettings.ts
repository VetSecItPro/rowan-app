/**
 * useAISettings — Client-side hook for AI user settings
 *
 * Fetches from /api/ai/settings once on mount. Returns settings with
 * loading state. The settings route only requires auth (no tier check),
 * so this will not 403 for free-tier users.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AIUserSettingsUpdate } from '@/lib/types/ai';

/** Client-side subset of AI settings (we only need the toggles, not DB metadata) */
type AISettingsClient = Required<AIUserSettingsUpdate>;

const DEFAULT_SETTINGS: AISettingsClient = {
  ai_enabled: true,
  voice_enabled: false,
  proactive_suggestions: true,
  morning_briefing: false,
  preferred_voice_lang: 'en-US',
  ai_onboarding_seen: false,
};

/** Loads and persists user-level AI feature settings */
export function useAISettings(enabled: boolean) {
  const [settings, setSettings] = useState<AISettingsClient>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!enabled) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/ai/settings');
      if (!res.ok) {
        setSettings(DEFAULT_SETTINGS);
        return;
      }
      const data = await res.json();
      if (data.data) {
        setSettings(data.data);
      }
    } catch {
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  /** Update one or more settings fields */
  const updateSetting = useCallback(async (update: Partial<AISettingsClient>) => {
    // Optimistic update
    setSettings((prev) => ({ ...prev, ...update }));

    try {
      const res = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!res.ok) {
        // Revert on failure
        await fetchSettings();
      }
    } catch {
      await fetchSettings();
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, isLoading, refresh: fetchSettings, updateSetting };
}
