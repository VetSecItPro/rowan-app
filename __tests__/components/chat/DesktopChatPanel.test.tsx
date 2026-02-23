// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/contexts/DeviceContext', () => ({
  useDevice: vi.fn(() => ({ isDesktop: true, isMobile: false })),
}));

vi.mock('@/lib/contexts/chat-context', () => ({
  useChatContextSafe: vi.fn(() => ({
    enabled: true,
    spaceId: 'space-1',
    isOpen: true,
    closeChat: vi.fn(),
    handleNewAssistantMessage: vi.fn(),
    voiceEnabled: true,
  })),
}));

vi.mock('@/components/chat/ChatPanel', () => ({
  default: ({ spaceId, persistent }: { spaceId: string; persistent?: boolean }) => (
    <div data-testid="chat-panel" data-space-id={spaceId} data-persistent={String(persistent)} />
  ),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { DesktopChatPanel } from '@/components/chat/DesktopChatPanel';
import { useDevice } from '@/lib/contexts/DeviceContext';
import { useChatContextSafe } from '@/lib/contexts/chat-context';

describe('DesktopChatPanel', () => {
  it('renders ChatPanel on desktop when AI is enabled', () => {
    render(<DesktopChatPanel />);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
  });

  it('renders as an aside element', () => {
    render(<DesktopChatPanel />);
    expect(document.querySelector('aside')).toBeInTheDocument();
  });

  it('passes persistent prop to ChatPanel', () => {
    render(<DesktopChatPanel />);
    expect(screen.getByTestId('chat-panel').dataset.persistent).toBe('true');
  });

  it('passes spaceId to ChatPanel', () => {
    render(<DesktopChatPanel />);
    expect(screen.getByTestId('chat-panel').dataset.spaceId).toBe('space-1');
  });

  it('returns null on mobile', () => {
    vi.mocked(useDevice).mockReturnValueOnce({ isDesktop: false, isMobile: true });

    const { container } = render(<DesktopChatPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when AI is disabled', () => {
    vi.mocked(useChatContextSafe).mockReturnValueOnce({ enabled: false, spaceId: 'space-1' } as ReturnType<typeof useChatContextSafe>);

    const { container } = render(<DesktopChatPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when context is null', () => {
    vi.mocked(useChatContextSafe).mockReturnValueOnce(null);

    const { container } = render(<DesktopChatPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when spaceId is missing', () => {
    vi.mocked(useChatContextSafe).mockReturnValueOnce({ enabled: true, spaceId: null } as ReturnType<typeof useChatContextSafe>);

    const { container } = render(<DesktopChatPanel />);
    expect(container.firstChild).toBeNull();
  });
});
