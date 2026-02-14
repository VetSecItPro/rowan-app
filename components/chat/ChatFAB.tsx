/**
 * ChatFAB — Renders the overlay Chat Panel (mobile/tablet only)
 *
 * On desktop (lg+), the persistent panel is rendered by DesktopChatPanel
 * in the layout flex row instead. This component only handles the
 * slide-in overlay for smaller screens.
 */

'use client';

import { useChatContextSafe } from '@/lib/contexts/chat-context';
import { useDevice } from '@/lib/contexts/DeviceContext';
import ChatPanel from './ChatPanel';

/** Renders a floating action button to open the AI chat panel. */
export default function ChatFAB() {
  const ctx = useChatContextSafe();
  const { isDesktop } = useDevice();

  // Don't render if no context, AI disabled, or user lacks AI access
  if (!ctx?.enabled || !ctx.spaceId) return null;

  // On desktop, the persistent panel is rendered by DesktopChatPanel
  if (isDesktop) return null;

  return (
    <ChatPanel
      spaceId={ctx.spaceId}
      isOpen={ctx.isOpen}
      onClose={ctx.closeChat}
      onNewAssistantMessage={ctx.handleNewAssistantMessage}
      voiceEnabled={ctx.voiceEnabled}
    />
  );
}
