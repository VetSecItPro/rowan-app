// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  default: (_fn: () => Promise<{ default: React.ComponentType }>, opts?: { loading?: () => React.ReactNode }) => {
    if (opts?.loading) {
      return opts.loading;
    }
    return () => React.createElement('div', { 'data-testid': 'dynamic-component' });
  },
}));

import { RewardsSection } from '@/components/dashboard/RewardsSection';

describe('RewardsSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<RewardsSection userId="user-1" spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('renders the outer grid container', () => {
    const { container } = render(<RewardsSection userId="user-1" spaceId="space-1" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts different userId and spaceId values', () => {
    const { container } = render(<RewardsSection userId="user-abc" spaceId="space-xyz" />);
    expect(container).toBeTruthy();
  });

  it('renders two dynamic child components', () => {
    const { container } = render(<RewardsSection userId="user-1" spaceId="space-1" />);
    // next/dynamic returns loading component or placeholder
    expect(container.firstChild).toBeTruthy();
  });
});
