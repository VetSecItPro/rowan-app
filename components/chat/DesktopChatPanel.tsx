/**
 * DesktopChatPanel — Persistent AI chat column for desktop (lg+)
 *
 * Renders inside the main flex layout as a sibling of MainContent.
 * On smaller screens, returns null — the overlay ChatPanel in ChatFAB
 * handles mobile/tablet instead.
 */

'use client';

import { useDevice } from '@/lib/contexts/DeviceContext';
import { useChatContextSafe } from '@/lib/contexts/chat-context';
import ChatPanel from './ChatPanel';

/** Renders a persistent desktop sidebar chat panel for the AI companion. */
export function DesktopChatPanel() {
  const { isDesktop } = useDevice();
  const ctx = useChatContextSafe();

  // Only render on desktop when AI is enabled and user has access
  if (!isDesktop || !ctx?.enabled || !ctx.spaceId) return null;

  return (
    <aside className="hidden lg:block fixed top-[80px] right-3 bottom-3 w-[320px] z-30">
      <ChatPanel
        spaceId={ctx.spaceId}
        isOpen={true}
        onClose={() => {}}
        onNewAssistantMessage={ctx.handleNewAssistantMessage}
        voiceEnabled={ctx.voiceEnabled}
        persistent
      />
    </aside>
  );
}
