'use client';

/**
 * AIOnboardingGate — Renders the AI welcome modal.
 *
 * Two trigger paths:
 *   1. First visit (auto): localStorage flag + server-synced AI settings.
 *      Fires once after 800ms delay; dismissal marks seen everywhere.
 *   2. Re-open by user (event): listens for `rowan:openAIWelcome` custom
 *      event on window. The Header sparkle button dispatches it. Lets users
 *      revisit the AI tour at any time after dismissing it.
 *
 * Always mounted (no early return) so the event-listener path works
 * regardless of dismissal state. The closed modal renders nothing.
 */

import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '@/lib/constants/feature-flags';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { useChatContextSafe } from '@/lib/contexts/chat-context';
import { AIWelcomeModal } from './AIWelcomeModal';

const STORAGE_KEY = 'rowan_ai_onboarding_seen';

/** Custom event the Header (or anywhere else) dispatches to re-open the modal. */
export const AI_WELCOME_REOPEN_EVENT = 'rowan:openAIWelcome';

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
  const { settings, isLoading, updateSetting } = useAISettings(enabled);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(() => isOnboardingSeen());

  // Sync: if server says seen but localStorage doesn't, update localStorage.
  // This reacts to async server data (external system) — setState in the
  // subscription callback pattern is appropriate here.
  useEffect(() => {
    if (!isLoading && settings.ai_onboarding_seen && !isOnboardingSeen()) {
      markOnboardingSeen();
      setDismissed(true);
    }
  }, [isLoading, settings.ai_onboarding_seen]);

  // Show modal automatically on first visit (settings loaded, not yet seen)
  useEffect(() => {
    if (!isLoading && enabled && !settings.ai_onboarding_seen && !dismissed) {
      const timer = setTimeout(() => setShowModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, enabled, settings.ai_onboarding_seen, dismissed]);

  // Re-open trigger: listen for custom event dispatched from anywhere
  // (typically Header sparkle button). Works regardless of dismissal state.
  useEffect(() => {
    if (!enabled) return;
    const handler = () => setShowModal(true);
    window.addEventListener(AI_WELCOME_REOPEN_EVENT, handler);
    return () => window.removeEventListener(AI_WELCOME_REOPEN_EVENT, handler);
  }, [enabled]);

  const markSeen = () => {
    setDismissed(true);
    markOnboardingSeen();
    updateSetting({ ai_onboarding_seen: true });
  };

  const handleClose = () => {
    setShowModal(false);
    // Only mark as seen if first-visit (haven't been seen before).
    // Re-opens after dismissal shouldn't re-trigger any "seen" tracking.
    if (!settings.ai_onboarding_seen && !dismissed) {
      markSeen();
    }
  };

  const handleTryIt = () => {
    setShowModal(false);
    if (!settings.ai_onboarding_seen && !dismissed) {
      markSeen();
    }
    chatCtx?.openChat();
  };

  // Don't render the modal if AI is disabled (feature flag off or no access).
  // Still render the wrapper so the event listener stays attached for users
  // whose access status flips at runtime — though in practice that's rare.
  if (!enabled || isLoading) {
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
