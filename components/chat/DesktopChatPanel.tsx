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

export function DesktopChatPanel() {
  const { isDesktop } = useDevice();
  const ctx = useChatContextSafe();

  // Only render on desktop when AI is enabled and user has access
  if (!isDesktop || !ctx?.enabled || !ctx.spaceId) return null;

  return (
    <aside className="hidden lg:flex lg:flex-col w-[380px] flex-shrink-0 overflow-hidden">
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
