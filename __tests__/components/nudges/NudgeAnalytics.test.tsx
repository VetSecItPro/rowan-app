// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@headlessui/react', () => {
  const Dialog = ({ children, className }: React.PropsWithChildren<{ className?: string }>) =>
    React.createElement('div', { className }, children);
  Dialog.Panel = ({ children, className }: React.PropsWithChildren<{ className?: string }>) =>
    React.createElement('div', { className }, children);
  Dialog.Title = ({ children, as: _as, className }: React.PropsWithChildren<{ as?: unknown; className?: string }>) =>
    React.createElement('h3', { className }, children);
  const Transition = ({ children, show }: React.PropsWithChildren<{ show?: boolean }>) =>
    show ? React.createElement(React.Fragment, null, children) : null;
  Transition.Child = ({ children }: React.PropsWithChildren) =>
    React.createElement(React.Fragment, null, children);
  return { Dialog, Transition };
});

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test' },
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/services/smart-nudges-service', () => ({
  smartNudgesService: {
    getNudgeAnalytics: vi.fn().mockResolvedValue({
      total_nudges: 10,
      read_nudges: 8,
      clicked_nudges: 5,
      effective_nudges: 4,
      dismissed_nudges: 2,
      read_rate: 80,
      click_rate: 50,
      effectiveness_rate: 40,
      category_breakdown: { reminder: 5, motivation: 3 },
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('NudgeAnalytics', () => {
  it('renders without crashing when closed', async () => {
    const { NudgeAnalytics } = await import('@/components/nudges/NudgeAnalytics');
    const { container } = render(<NudgeAnalytics isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  it('renders dialog content when open', async () => {
    const { NudgeAnalytics } = await import('@/components/nudges/NudgeAnalytics');
    const { container } = render(<NudgeAnalytics isOpen={true} onClose={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  it('renders Nudge Analytics title when open', async () => {
    const { NudgeAnalytics } = await import('@/components/nudges/NudgeAnalytics');
    render(<NudgeAnalytics isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Nudge Analytics')).toBeTruthy();
  });

  it('renders Time Range selector when open', async () => {
    const { NudgeAnalytics } = await import('@/components/nudges/NudgeAnalytics');
    render(<NudgeAnalytics isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Time Range')).toBeTruthy();
  });

  it('renders Close button when open', async () => {
    const { NudgeAnalytics } = await import('@/components/nudges/NudgeAnalytics');
    render(<NudgeAnalytics isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
});
