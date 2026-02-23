// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Hoist stable references to avoid infinite useEffect loops
const mockAuthValue = vi.hoisted(() => ({
  user: { id: 'user-1' },
  currentSpace: { id: 'space-1', name: 'Test' },
  loading: false,
  signOut: vi.fn(),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => mockAuthValue),
}));

vi.mock('@/lib/services/smart-nudges-service', () => ({
  smartNudgesService: {
    upsertNudgeSettings: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, title, isOpen, footer }: React.PropsWithChildren<{ title?: string; isOpen?: boolean; footer?: React.ReactNode }>) =>
    isOpen ? React.createElement('div', { 'data-testid': 'modal' }, [
      React.createElement('h2', { key: 'title' }, title),
      children,
      footer,
    ]) : null,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) =>
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('lucide-react', () => ({
  Clock: () => React.createElement('span', null, 'Clock'),
  Volume2: () => React.createElement('span', null, 'Volume2'),
  VolumeX: () => React.createElement('span', null, 'VolumeX'),
}));

import { NudgeSettingsModal } from '@/components/nudges/NudgeSettingsModal';

describe('NudgeSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when closed', () => {
    const { container } = render(
      <NudgeSettingsModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal content when open', () => {
    render(<NudgeSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders Nudge Settings title', () => {
    render(<NudgeSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Nudge Settings')).toBeTruthy();
  });

  it('renders Smart Nudges toggle', () => {
    render(<NudgeSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Smart Nudges')).toBeTruthy();
  });

  it('renders Save Settings button', () => {
    render(<NudgeSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save settings/i })).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<NudgeSettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
  });
});
