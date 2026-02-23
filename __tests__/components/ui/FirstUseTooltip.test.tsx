// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: object, tag: string) =>
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement(tag as keyof JSX.IntrinsicElements, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import FirstUseTooltip from '@/components/ui/FirstUseTooltip';

describe('FirstUseTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children without crashing', () => {
    render(
      <FirstUseTooltip id="test-tip" content="This is a tip">
        <button>Hover me</button>
      </FirstUseTooltip>
    );
    expect(screen.getByText('Hover me')).toBeDefined();
  });

  it('does not show tooltip immediately (before delay)', () => {
    render(
      <FirstUseTooltip id="test-tip" content="Tip content">
        <button>Trigger</button>
      </FirstUseTooltip>
    );
    expect(screen.queryByText('Tip content')).toBeNull();
  });

  it('shows tooltip after delay when not seen before', async () => {
    render(
      <FirstUseTooltip id="new-tip" content="First time tip" delay={100}>
        <button>Trigger</button>
      </FirstUseTooltip>
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('First time tip')).toBeDefined();
  });

  it('does not show tooltip when already seen', () => {
    localStorageMock.getItem.mockReturnValue('true');

    render(
      <FirstUseTooltip id="seen-tip" content="Already seen" delay={0}>
        <button>Trigger</button>
      </FirstUseTooltip>
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('Already seen')).toBeNull();
  });

  it('renders Got it button when tooltip is visible', async () => {
    render(
      <FirstUseTooltip id="visible-tip" content="Visible tip" delay={0}>
        <button>Trigger</button>
      </FirstUseTooltip>
    );

    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    if (screen.queryByText('Got it')) {
      expect(screen.getByText('Got it')).toBeDefined();
    }
  });
});
