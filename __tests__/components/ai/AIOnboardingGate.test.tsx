// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

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

const mockUseAISettings = vi.fn(() => ({
  settings: { ai_onboarding_seen: true },
  isLoading: false,
  updateSetting: vi.fn(),
}));

vi.mock('@/lib/hooks/useAISettings', () => ({
  useAISettings: (...args: unknown[]) => mockUseAISettings(...args),
}));

vi.mock('@/components/ai/AIWelcomeModal', () => ({
  AIWelcomeModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="ai-welcome-modal">Welcome Modal</div> : null,
}));

// Mock localStorage before importing the component
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _setItem: (key: string, value: string) => { store[key] = value; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

const STORAGE_KEY = 'rowan_ai_onboarding_seen';

import { AIOnboardingGate } from '@/components/ai/AIOnboardingGate';

describe('AIOnboardingGate', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Restore defaults after clearAllMocks
    mockUseChatContextSafe.mockReturnValue({
      enabled: true,
      canAccessAI: true,
      openChat: mockOpenChat,
    });
    mockUseAISettings.mockReturnValue({
      settings: { ai_onboarding_seen: true },
      isLoading: false,
      updateSetting: vi.fn(),
    });
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.useRealTimers();
  });

  it('renders nothing (null) when onboarding is already seen', () => {
    mockUseAISettings.mockReturnValue({
      settings: { ai_onboarding_seen: true },
      isLoading: false,
      updateSetting: vi.fn(),
    });
    const { container } = render(<AIOnboardingGate />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when AI is loading', () => {
    mockUseAISettings.mockReturnValue({
      settings: { ai_onboarding_seen: false },
      isLoading: true,
      updateSetting: vi.fn(),
    });
    const { container } = render(<AIOnboardingGate />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when chatCtx is null', () => {
    mockUseChatContextSafe.mockReturnValueOnce(null as unknown as ReturnType<typeof mockUseChatContextSafe>);
    const { container } = render(<AIOnboardingGate />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when canAccessAI is false', () => {
    mockUseChatContextSafe.mockReturnValueOnce({ enabled: true, canAccessAI: false, openChat: vi.fn() });
    const { container } = render(<AIOnboardingGate />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when already dismissed via localStorage', () => {
    localStorageMock.getItem.mockImplementation((key: string) =>
      key === STORAGE_KEY ? '1' : null
    );
    mockUseAISettings.mockReturnValue({
      settings: { ai_onboarding_seen: false },
      isLoading: false,
      updateSetting: vi.fn(),
    });
    const { container } = render(<AIOnboardingGate />);
    expect(container.firstChild).toBeNull();
  });
});
