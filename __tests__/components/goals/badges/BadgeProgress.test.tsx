// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock('@/lib/services/achievement-service', () => ({
  getBadgeProgress: vi.fn(() => Promise.resolve([])),
}));

import BadgeProgress from '@/components/goals/badges/BadgeProgress';

describe('BadgeProgress', () => {
  it('renders without crashing', () => {
    const { container } = render(<BadgeProgress userId="user-1" spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('renders loading spinner initially', () => {
    const { container } = render(<BadgeProgress userId="user-1" spaceId="space-1" />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('accepts limit prop', () => {
    const { container } = render(<BadgeProgress userId="user-1" spaceId="space-1" limit={3} />);
    expect(container).toBeTruthy();
  });

  it('accepts userId and spaceId props', () => {
    const { container } = render(<BadgeProgress userId="user-abc" spaceId="space-xyz" />);
    expect(container).toBeTruthy();
  });
});
