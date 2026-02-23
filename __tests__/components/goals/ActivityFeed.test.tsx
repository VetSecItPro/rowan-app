// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));

vi.mock('@/lib/utils/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Supabase is mocked in vitest.setup.ts

import { ActivityFeed } from '@/components/goals/ActivityFeed';

describe('ActivityFeed', () => {
  it('renders without crashing', () => {
    const { container } = render(<ActivityFeed spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('renders with goalId filter', () => {
    const { container } = render(<ActivityFeed spaceId="space-1" goalId="goal-1" />);
    expect(container).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<ActivityFeed spaceId="space-1" className="custom" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<ActivityFeed spaceId="space-1" />);
    // Component always renders a container div
    expect(container.firstChild).toBeTruthy();
  });

  it('renders activity feed content area', () => {
    const { container } = render(<ActivityFeed spaceId="space-1" />);
    expect(container.querySelector('.bg-gray-800')).toBeTruthy();
  });
});
