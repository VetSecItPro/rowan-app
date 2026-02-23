// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  useReducedMotion: vi.fn(() => false),
}));

import { HouseholdBalanceTeaser } from '@/components/home/HouseholdBalanceTeaser';

describe('HouseholdBalanceTeaser', () => {
  it('renders without crashing', () => {
    const { container } = render(<HouseholdBalanceTeaser />);
    expect(container).toBeTruthy();
  });

  it('renders demo member names', () => {
    render(<HouseholdBalanceTeaser />);
    expect(screen.getByText('Sarah')).toBeTruthy();
    expect(screen.getByText('Mike')).toBeTruthy();
  });

  it('renders a section container', () => {
    const { container } = render(<HouseholdBalanceTeaser />);
    expect(container.querySelector('section')).toBeTruthy();
  });
});
