// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string; [key: string]: unknown }>) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

const mockToggleChat = vi.fn();
const mockPromptUpgrade = vi.fn();
const mockChatContext = {
  hasUnread: false,
  canAccessAI: true,
  toggleChat: mockToggleChat,
  promptUpgrade: mockPromptUpgrade,
};

vi.mock('@/lib/contexts/chat-context', () => ({
  useChatContextSafe: vi.fn(() => mockChatContext),
}));

vi.mock('@/lib/native/haptics', () => ({
  triggerHaptic: vi.fn(),
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
}));

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatContext.canAccessAI = true;
    mockChatContext.hasUnread = false;
    mockChatContext.toggleChat = mockToggleChat;
    mockChatContext.promptUpgrade = mockPromptUpgrade;
  });

  it('renders without crashing', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders nav element with main navigation label', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(<BottomNav />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeTruthy();
  });

  it('renders Home tab link', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(<BottomNav />);
    expect(screen.getByLabelText('Home')).toBeTruthy();
  });

  it('renders Tasks tab link', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(<BottomNav />);
    expect(screen.getByLabelText('Tasks')).toBeTruthy();
  });

  it('renders Calendar tab link', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(<BottomNav />);
    expect(screen.getByLabelText('Calendar')).toBeTruthy();
  });

  it('renders the Rowan AI button when AI access is enabled', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(<BottomNav />);
    expect(screen.getByLabelText(/open ai chat/i)).toBeTruthy();
  });

  it('renders upgrade prompt when AI is locked', async () => {
    mockChatContext.canAccessAI = false;
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(<BottomNav />);
    expect(screen.getByLabelText(/upgrade to pro for ai/i)).toBeTruthy();
  });

  it('calls toggleChat when AI button is clicked', async () => {
    mockChatContext.canAccessAI = true;
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(<BottomNav />);
    const aiBtn = screen.getByLabelText(/open ai chat/i);
    fireEvent.click(aiBtn);
    expect(mockToggleChat).toHaveBeenCalled();
  });

  it('calls promptUpgrade when locked AI button is clicked', async () => {
    mockChatContext.canAccessAI = false;
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(<BottomNav />);
    const lockedBtn = screen.getByLabelText(/upgrade to pro for ai/i);
    fireEvent.click(lockedBtn);
    expect(mockPromptUpgrade).toHaveBeenCalled();
  });
});
