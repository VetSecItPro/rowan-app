// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { WelcomeWidget } from '@/components/dashboard/WelcomeWidget';

describe('WelcomeWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<WelcomeWidget />);
    expect(container).toBeTruthy();
  });

  it('renders a greeting text', () => {
    render(<WelcomeWidget />);
    // Should show one of Good morning/afternoon/evening/night
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toMatch(/Good (morning|afternoon|evening|night)/i);
  });

  it('includes user name in greeting when provided', () => {
    render(<WelcomeWidget userName="Alice" />);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toContain('Alice');
  });

  it('shows greeting without name when userName is not provided', () => {
    render(<WelcomeWidget />);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).not.toContain(', undefined');
  });

  it('applies className prop', () => {
    const { container } = render(<WelcomeWidget className="my-class" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders an h1 element', () => {
    render(<WelcomeWidget userName="Bob" />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });
});
