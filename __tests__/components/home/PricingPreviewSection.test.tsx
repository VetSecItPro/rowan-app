// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  useReducedMotion: vi.fn(() => false),
}));

import { PricingPreviewSection } from '@/components/home/PricingPreviewSection';

describe('PricingPreviewSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<PricingPreviewSection onSignupClick={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  it('renders the section heading', () => {
    render(<PricingPreviewSection onSignupClick={vi.fn()} />);
    expect(screen.getByText('Simple, transparent pricing')).toBeTruthy();
  });

  it('renders all three pricing tier names', () => {
    render(<PricingPreviewSection onSignupClick={vi.fn()} />);
    expect(screen.getByText('Free')).toBeTruthy();
    expect(screen.getByText('Pro')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
  });

  it('renders pricing amounts', () => {
    render(<PricingPreviewSection onSignupClick={vi.fn()} />);
    expect(screen.getByText('$0')).toBeTruthy();
    expect(screen.getByText('$18')).toBeTruthy();
    expect(screen.getByText('$29')).toBeTruthy();
  });

  it('renders the Popular badge for the Pro tier', () => {
    render(<PricingPreviewSection onSignupClick={vi.fn()} />);
    expect(screen.getByText('Popular')).toBeTruthy();
  });

  it('renders the Start Free button for Free tier', () => {
    render(<PricingPreviewSection onSignupClick={vi.fn()} />);
    expect(screen.getByText('Start Free')).toBeTruthy();
  });

  it('renders the See full pricing details link', () => {
    render(<PricingPreviewSection onSignupClick={vi.fn()} />);
    expect(screen.getByText(/See full pricing details/i)).toBeTruthy();
  });

  it('calls onSignupClick when a tier button is clicked', () => {
    const onSignupClick = vi.fn();
    render(<PricingPreviewSection onSignupClick={onSignupClick} />);
    fireEvent.click(screen.getByText('Start Free'));
    expect(onSignupClick).toHaveBeenCalledTimes(1);
  });
});
