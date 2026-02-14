'use client';

/**
 * AIOnboardingGate — Shows the AI welcome modal on first visit
 *
 * Uses localStorage as the primary guard (survives remounts, navigation,
 * and API failures). Also persists to the server via AI settings so it
 * syncs across devices.
 *
 * SAFETY: If the server returns 403 (user has no AI access), the gate
 * silently renders nothing — no modal, no retries, no console spam.
 */

import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '@/lib/constants/feature-flags';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { useChatContextSafe } from '@/lib/contexts/chat-context';
import { AIWelcomeModal } from './AIWelcomeModal';

const STORAGE_KEY = 'rowan_ai_onboarding_seen';

function isOnboardingSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Storage unavailable — still works via server setting
  }
}

/** Gates AI feature access behind an onboarding flow for first-time users. */
export function AIOnboardingGate() {
  const chatCtx = useChatContextSafe();
  const enabled = FEATURE_FLAGS.AI_COMPANION && !!chatCtx?.canAccessAI;
  const { settings, isLoading, noAccess, updateSetting } = useAISettings(enabled);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(() => isOnboardingSeen());

  // Sync: if server says seen but localStorage doesn't, update localStorage.
  // This reacts to async server data (external system) — setState in the
  // subscription callback pattern is appropriate here.
  useEffect(() => {
    if (!isLoading && settings.ai_onboarding_seen && !isOnboardingSeen()) {
      markOnboardingSeen();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing server state to local; necessary for cross-device consistency
      setDismissed(true);
    }
  }, [isLoading, settings.ai_onboarding_seen]);

  // Show modal when settings are loaded and onboarding hasn't been seen
  useEffect(() => {
    if (!isLoading && enabled && !noAccess && !settings.ai_onboarding_seen && !dismissed) {
      const timer = setTimeout(() => setShowModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, enabled, noAccess, settings.ai_onboarding_seen, dismissed]);

  const markSeen = () => {
    setDismissed(true);
    markOnboardingSeen();
    updateSetting({ ai_onboarding_seen: true });
  };

  const handleClose = () => {
    setShowModal(false);
    markSeen();
  };

  const handleTryIt = () => {
    setShowModal(false);
    markSeen();
    chatCtx?.openChat();
  };

  // Don't render anything if: not enabled, still loading, no AI access,
  // onboarding already seen, or already dismissed
  if (!enabled || isLoading || noAccess || settings.ai_onboarding_seen || dismissed) {
    return null;
  }

  return (
    <AIWelcomeModal
      isOpen={showModal}
      onClose={handleClose}
      onTryIt={handleTryIt}
    />
  );
}
