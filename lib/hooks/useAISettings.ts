/**
 * useAISettings — Client-side hook for AI user settings
 *
 * Fetches from /api/ai/settings once on mount. Returns settings with
 * loading state. Re-fetches when spaceId changes.
 *
 * IMPORTANT: Handles 403 (no AI access) gracefully — marks onboarding as
 * seen and sets noAccess flag so the UI never shows AI-gated modals.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

/** Settings returned when user has no AI access (403) — prevents modal from showing */
const NO_ACCESS_SETTINGS: AISettingsClient = {
  ...DEFAULT_SETTINGS,
  ai_enabled: false,
  ai_onboarding_seen: true, // Prevents AIOnboardingGate from showing
};

/** Loads and persists user-level AI feature settings */
export function useAISettings(enabled: boolean) {
  const [settings, setSettings] = useState<AISettingsClient>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  /** True if the server returned 403 — client-server tier mismatch */
  const [noAccess, setNoAccess] = useState(false);
  const noAccessRef = useRef(false);

  const fetchSettings = useCallback(async () => {
    if (!enabled || noAccessRef.current) {
      setSettings(noAccessRef.current ? NO_ACCESS_SETTINGS : DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/ai/settings');
      if (res.status === 403) {
        // User doesn't have AI access — prevent any further AI API calls
        noAccessRef.current = true;
        setNoAccess(true);
        setSettings(NO_ACCESS_SETTINGS);
        return;
      }
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
    // If we already know the user has no access, don't even try
    if (noAccessRef.current) return;

    // Optimistic update
    setSettings((prev) => ({ ...prev, ...update }));

    try {
      const res = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (res.status === 403) {
        // Lock out — no AI access
        noAccessRef.current = true;
        setNoAccess(true);
        setSettings(NO_ACCESS_SETTINGS);
        return;
      }
      if (!res.ok) {
        // Revert on other failures
        await fetchSettings();
      }
    } catch {
      await fetchSettings();
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, isLoading, noAccess, refresh: fetchSettings, updateSetting };
}
