// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  useReducedMotion: vi.fn(() => false),
}));

import { PainPointsSection } from '@/components/home/PainPointsSection';

describe('PainPointsSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<PainPointsSection />);
    expect(container).toBeTruthy();
  });

  it('renders the "Sound familiar?" prompt', () => {
    render(<PainPointsSection />);
    expect(screen.getByText('Sound familiar?')).toBeTruthy();
  });

  it('renders the pain point quotes', () => {
    render(<PainPointsSection />);
    expect(screen.getByText(/Who was supposed to pick up the kids/i)).toBeTruthy();
    expect(screen.getByText(/Did we already buy milk/i)).toBeTruthy();
    expect(screen.getByText(/When is that appointment again/i)).toBeTruthy();
  });

  it('renders the solution tagline', () => {
    render(<PainPointsSection />);
    expect(screen.getByText(/There.s a better way to run your household/i)).toBeTruthy();
  });

  it('renders a section element', () => {
    const { container } = render(<PainPointsSection />);
    expect(container.querySelector('section')).toBeTruthy();
  });
});
