// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock('@/lib/services/achievement-service', () => ({
  getUserBadges: vi.fn(() => Promise.resolve([])),
  getUserBadgeStats: vi.fn(() => Promise.resolve({ totalBadges: 0, totalPoints: 0 })),
}));

import BadgesWidget from '@/components/goals/badges/BadgesWidget';

describe('BadgesWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<BadgesWidget userId="user-1" spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('renders loading state initially', () => {
    const { container } = render(<BadgesWidget userId="user-1" spaceId="space-1" />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('accepts userId and spaceId props', () => {
    const { container } = render(<BadgesWidget userId="user-abc" spaceId="space-xyz" />);
    expect(container).toBeTruthy();
  });
});
