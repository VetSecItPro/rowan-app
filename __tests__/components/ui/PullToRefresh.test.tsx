// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/native/haptics', () => ({
  triggerHaptic: vi.fn(() => Promise.resolve()),
}));

import { PullToRefresh } from '@/components/ui/PullToRefresh';

describe('PullToRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <PullToRefresh onRefresh={vi.fn().mockResolvedValue(undefined)}>
        <p>Content</p>
      </PullToRefresh>
    );
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('renders children', () => {
    render(
      <PullToRefresh onRefresh={vi.fn().mockResolvedValue(undefined)}>
        <div>My list content</div>
      </PullToRefresh>
    );
    expect(screen.getByText('My list content')).toBeDefined();
  });

  it('renders correctly when disabled', () => {
    render(
      <PullToRefresh onRefresh={vi.fn().mockResolvedValue(undefined)} disabled>
        <p>Disabled content</p>
      </PullToRefresh>
    );
    expect(screen.getByText('Disabled content')).toBeDefined();
  });
});
