/**
 * MainContent — Responsive main content wrapper
 *
 * Takes all remaining horizontal space in the flex layout between
 * Sidebar (left) and DesktopChatPanel (right, when present).
 */

import { ReactNode } from 'react';

export function MainContent({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex-1 min-w-0 overflow-auto flex flex-col pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0"
    >
      {children}
    </main>
  );
}
