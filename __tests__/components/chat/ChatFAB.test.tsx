// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/contexts/chat-context', () => ({
  useChatContextSafe: vi.fn(() => ({
    enabled: true,
    spaceId: 'space-1',
    isOpen: false,
    closeChat: vi.fn(),
    handleNewAssistantMessage: vi.fn(),
    voiceEnabled: true,
  })),
}));

vi.mock('@/lib/contexts/DeviceContext', () => ({
  useDevice: vi.fn(() => ({ isDesktop: false, isMobile: true })),
}));

vi.mock('@/components/chat/ChatPanel', () => ({
  default: ({ spaceId, isOpen }: { spaceId: string; isOpen: boolean }) => (
    <div data-testid="chat-panel" data-space-id={spaceId} data-open={String(isOpen)} />
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

import ChatFAB from '@/components/chat/ChatFAB';
import { useChatContextSafe } from '@/lib/contexts/chat-context';
import { useDevice } from '@/lib/contexts/DeviceContext';

describe('ChatFAB', () => {
  it('renders ChatPanel on mobile when AI is enabled', () => {
    const { getByTestId } = render(<ChatFAB />);
    expect(getByTestId('chat-panel')).toBeInTheDocument();
  });

  it('returns null when context is not available', () => {
    vi.mocked(useChatContextSafe).mockReturnValueOnce(null);

    const { container } = render(<ChatFAB />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when AI is disabled', () => {
    vi.mocked(useChatContextSafe).mockReturnValueOnce({ enabled: false, spaceId: 'space-1' } as ReturnType<typeof useChatContextSafe>);

    const { container } = render(<ChatFAB />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when no spaceId', () => {
    vi.mocked(useChatContextSafe).mockReturnValueOnce({ enabled: true, spaceId: null } as ReturnType<typeof useChatContextSafe>);

    const { container } = render(<ChatFAB />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on desktop', () => {
    vi.mocked(useDevice).mockReturnValueOnce({ isDesktop: true, isMobile: false });

    const { container } = render(<ChatFAB />);
    expect(container.firstChild).toBeNull();
  });

  it('passes spaceId to ChatPanel', () => {
    const { getByTestId } = render(<ChatFAB />);
    expect(getByTestId('chat-panel').dataset.spaceId).toBe('space-1');
  });
});
