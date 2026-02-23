// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) =>
      ({ children, ...props }: { children?: React.ReactNode }) =>
        React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/constants/feature-flags', () => ({
  FEATURE_FLAGS: { AI_COMPANION: true },
}));

const mockOpenChat = vi.fn();
const mockUseChatContextSafe = vi.fn(() => ({
  enabled: true,
  canAccessAI: true,
  openChat: mockOpenChat,
}));

vi.mock('@/lib/contexts/chat-context', () => ({
  useChatContextSafe: () => mockUseChatContextSafe(),
}));

// Mock localStorage before importing the component
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _store: () => store,
    _setItem: (key: string, value: string) => { store[key] = value; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { AIContextualHint } from '@/components/ai/AIContextualHint';

const STORAGE_KEY = 'rowan_ai_hint_dismissed_tasks';

describe('AIContextualHint', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockImplementation((key: string) => {
      return localStorageMock._store()[key] ?? null;
    });
    vi.clearAllMocks();
    // Restore the default mock after clearAllMocks
    mockUseChatContextSafe.mockReturnValue({
      enabled: true,
      canAccessAI: true,
      openChat: mockOpenChat,
    });
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('renders when AI is enabled and not dismissed', () => {
    render(<AIContextualHint featureKey="tasks" prompt="Add a task" />);
    expect(screen.getByText('Try Rowan AI')).toBeTruthy();
  });

  it('shows the provided prompt text', () => {
    render(<AIContextualHint featureKey="tasks" prompt="Add a task for tomorrow" />);
    expect(screen.getByText(/Add a task for tomorrow/)).toBeTruthy();
  });

  it('shows custom label when provided', () => {
    render(<AIContextualHint featureKey="tasks" prompt="Add a task" label="Ask AI" />);
    expect(screen.getByText('Ask AI')).toBeTruthy();
  });

  it('renders Ask button', () => {
    render(<AIContextualHint featureKey="tasks" prompt="Do something" />);
    expect(screen.getByText('Ask')).toBeTruthy();
  });

  it('renders dismiss button with aria-label', () => {
    render(<AIContextualHint featureKey="tasks" prompt="Do something" />);
    expect(screen.getByLabelText('Dismiss AI hint')).toBeTruthy();
  });

  it('dismisses hint when X button is clicked', () => {
    render(<AIContextualHint featureKey="tasks" prompt="Do something" />);
    const dismissBtn = screen.getByLabelText('Dismiss AI hint');
    fireEvent.click(dismissBtn);
    expect(screen.queryByText('Try Rowan AI')).toBeNull();
  });

  it('persists dismissal to localStorage', () => {
    render(<AIContextualHint featureKey="tasks" prompt="Do something" />);
    const dismissBtn = screen.getByLabelText('Dismiss AI hint');
    fireEvent.click(dismissBtn);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'true');
  });

  it('does not render when already dismissed in localStorage', () => {
    localStorageMock.getItem.mockImplementation((key: string) =>
      key === STORAGE_KEY ? 'true' : null
    );
    render(<AIContextualHint featureKey="tasks" prompt="Do something" />);
    expect(screen.queryByText('Try Rowan AI')).toBeNull();
  });

  it('calls openChat when Ask button is clicked', () => {
    render(<AIContextualHint featureKey="tasks" prompt="Add a task" />);
    fireEvent.click(screen.getByText('Ask'));
    expect(mockOpenChat).toHaveBeenCalledTimes(1);
  });

  it('does not render when chatCtx is null', () => {
    mockUseChatContextSafe.mockReturnValueOnce(null as unknown as ReturnType<typeof mockUseChatContextSafe>);
    render(<AIContextualHint featureKey="tasks" prompt="Do something" />);
    expect(screen.queryByText('Try Rowan AI')).toBeNull();
  });

  it('does not render when chatCtx.enabled is false', () => {
    mockUseChatContextSafe.mockReturnValueOnce({ enabled: false, canAccessAI: true, openChat: vi.fn() });
    render(<AIContextualHint featureKey="tasks" prompt="Do something" />);
    expect(screen.queryByText('Try Rowan AI')).toBeNull();
  });
});
