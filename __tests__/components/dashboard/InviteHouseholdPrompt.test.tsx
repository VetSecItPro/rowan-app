// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
       
      const { variants, initial, animate, exit, whileHover, whileTap, ...rest } = props as Record<string, unknown>;
      return React.createElement(tag as string, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

import { InviteHouseholdPrompt } from '@/components/dashboard/InviteHouseholdPrompt';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('InviteHouseholdPrompt', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders without crashing', () => {
    const { container } = render(<InviteHouseholdPrompt memberCount={1} />);
    expect(container).toBeTruthy();
  });

  it('does not show when memberCount > 1', async () => {
    await act(async () => {
      render(<InviteHouseholdPrompt memberCount={3} />);
    });
    expect(screen.queryByText('Better together')).toBeNull();
  });

  it('does not show when previously dismissed', async () => {
    localStorageMock.setItem('rowan_invite_dismissed', 'true');
    await act(async () => {
      render(<InviteHouseholdPrompt memberCount={1} />);
    });
    expect(screen.queryByText('Better together')).toBeNull();
  });

  it('shows prompt content when memberCount is 1 and not dismissed', async () => {
    await act(async () => {
      render(<InviteHouseholdPrompt memberCount={1} />);
    });
    // After hydration with memberCount=1 and not dismissed, content should show
    expect(screen.getByText('Better together')).toBeTruthy();
  });

  it('shows Invite Members button', async () => {
    await act(async () => {
      render(<InviteHouseholdPrompt memberCount={1} />);
    });
    expect(screen.getByText('Invite Members')).toBeTruthy();
  });

  it('shows dismiss button', async () => {
    await act(async () => {
      render(<InviteHouseholdPrompt memberCount={1} />);
    });
    expect(screen.getByLabelText('Dismiss invite prompt')).toBeTruthy();
  });

  it('shows descriptive text', async () => {
    await act(async () => {
      render(<InviteHouseholdPrompt memberCount={1} />);
    });
    expect(screen.getByText(/Rowan works best when your whole family/)).toBeTruthy();
  });
});
