'use client';

/**
 * AIOnboardingGate — Shows the AI welcome modal on first visit
 *
 * Checks ai_onboarding_seen from the AI settings. If false and AI is enabled,
 * shows the AIWelcomeModal. On dismiss or "Try It", marks onboarding as seen
 * and optionally opens the chat panel.
 */

import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '@/lib/constants/feature-flags';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { useChatContextSafe } from '@/lib/contexts/chat-context';
import { AIWelcomeModal } from './AIWelcomeModal';

export function AIOnboardingGate() {
  const chatCtx = useChatContextSafe();
  const enabled = FEATURE_FLAGS.AI_COMPANION && !!chatCtx?.canAccessAI;
  const { settings, isLoading, updateSetting } = useAISettings(enabled);
  const [showModal, setShowModal] = useState(false);

  // Show modal when settings are loaded and onboarding hasn't been seen
  useEffect(() => {
    if (!isLoading && enabled && !settings.ai_onboarding_seen) {
      // Small delay to let the page settle first
      const timer = setTimeout(() => setShowModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, enabled, settings.ai_onboarding_seen]);

  const markSeen = () => {
    updateSetting({ ai_onboarding_seen: true });
  };

  const handleClose = () => {
    setShowModal(false);
    markSeen();
  };

  const handleTryIt = () => {
    setShowModal(false);
    markSeen();
    // Open the chat panel
    chatCtx?.openChat();
  };

  if (!enabled || isLoading || settings.ai_onboarding_seen) {
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
