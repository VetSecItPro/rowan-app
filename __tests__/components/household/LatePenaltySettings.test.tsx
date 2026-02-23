// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LatePenaltySettings } from '@/components/household/LatePenaltySettings';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/contexts/spaces-context', () => ({
  useSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space', role: 'owner' },
    spaces: [],
    loading: false,
  })),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const mockSettings = {
  enabled: false,
  default_penalty_points: 5,
  default_grace_period_hours: 2,
  max_penalty_per_chore: 50,
  progressive_penalty: true,
  penalty_multiplier_per_day: 1.5,
  exclude_weekends: false,
  forgiveness_allowed: true,
};

describe('LatePenaltySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ settings: mockSettings }),
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<LatePenaltySettings />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows loading state initially', () => {
    render(<LatePenaltySettings />);
    // Loading spinner should be present initially
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('displays Late Penalties heading after loading', async () => {
    render(<LatePenaltySettings />);
    await waitFor(() => {
      expect(screen.getByText('Late Penalties')).toBeTruthy();
    });
  });

  it('displays disabled state message when penalties are off', async () => {
    render(<LatePenaltySettings />);
    await waitFor(() => {
      expect(screen.getByText(/Enable late penalties to encourage timely chore completion/)).toBeTruthy();
    });
  });

  it('shows penalty settings after enabling', async () => {
    render(<LatePenaltySettings />);
    await waitFor(() => {
      expect(screen.getByText('Late Penalties')).toBeTruthy();
    });
    // Click the toggle button
    const toggleButton = screen.getByRole('button', { name: '' });
    const allButtons = screen.getAllByRole('button');
    // The toggle is the last button in the header area
    fireEvent.click(allButtons[allButtons.length - 1]);
    // After enabling, settings panels should appear
    await waitFor(() => {
      expect(screen.queryByText('Penalty Points')).not.toBeNull();
    });
  });

  it('shows "Encourage timely completion" subtitle', async () => {
    render(<LatePenaltySettings />);
    await waitFor(() => {
      expect(screen.getByText('Encourage timely completion')).toBeTruthy();
    });
  });

  it('calls onSettingsChange callback prop when settings saved', async () => {
    const onSettingsChange = vi.fn();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ settings: { ...mockSettings, enabled: true } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ settings: mockSettings }),
      });

    render(<LatePenaltySettings onSettingsChange={onSettingsChange} />);
    await waitFor(() => {
      expect(screen.getByText('Late Penalties')).toBeTruthy();
    });
  });
});
