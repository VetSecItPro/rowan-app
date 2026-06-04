// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Forward the LCP-relevant props (sizes, priority) onto the rendered <img> so
// the PERF-014 regression tests can assert them.
vi.mock('next/image', () => ({
  default: ({ src, alt, sizes, priority }: { src: string; alt: string; sizes?: string; priority?: boolean }) =>
    React.createElement('img', {
      src,
      alt,
      sizes,
      'data-priority': priority ? 'true' : undefined,
    }),
}));
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="remotion-player" />,
}));
vi.mock('@/remotion/compositions/HeroShowcase', () => ({ HeroShowcase: () => null }));

// Capture every `initial` object handed to a motion element so we can assert the
// above-fold entrance never starts at opacity:0 (PERF-014 - that would paint the
// LCP element invisible until JS hydrates). The proxy strips motion-only props
// (initial/animate/transition/style) before delegating to the DOM element.
const motionInitials: Array<Record<string, unknown>> = [];
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag) =>
        ({
          children,
          initial,
          animate: _animate,
          transition: _transition,
          style: _style,
          ...props
        }: {
          children?: React.ReactNode;
          initial?: Record<string, unknown>;
          animate?: unknown;
          transition?: unknown;
          style?: unknown;
          [key: string]: unknown;
        }) => {
          if (initial && typeof initial === 'object') motionInitials.push(initial);
          return React.createElement(tag as string, props, children);
        },
    }
  ),
  useScroll: vi.fn(() => ({ scrollYProgress: { get: () => 0 } })),
  useTransform: vi.fn((_, __, values: unknown[]) => values[0]),
  useReducedMotion: vi.fn(() => false),
}));
vi.mock('@/components/ui/magnetic-button', () => ({
  MagneticButton: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; [key: string]: unknown }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

import { HeroSection } from '@/components/home/HeroSection';

describe('HeroSection', () => {
  beforeEach(() => {
    motionInitials.length = 0;
  });

  it('renders without crashing', () => {
    const onSignupClick = vi.fn();
    const onPricingClick = vi.fn();
    const { container } = render(
      <HeroSection onSignupClick={onSignupClick} onPricingClick={onPricingClick} />
    );
    expect(container).toBeTruthy();
  });

  it('renders signup button', () => {
    const onSignupClick = vi.fn();
    const onPricingClick = vi.fn();
    render(<HeroSection onSignupClick={onSignupClick} onPricingClick={onPricingClick} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onSignupClick when signup button is clicked', () => {
    const onSignupClick = vi.fn();
    const onPricingClick = vi.fn();
    render(<HeroSection onSignupClick={onSignupClick} onPricingClick={onPricingClick} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSignupClick).toHaveBeenCalled();
  });

  // PERF-014 (LCP) regression guards -----------------------------------------

  it('serves a right-sized, preloaded dashboard image (no 4K upscale on the LCP element)', () => {
    render(<HeroSection onSignupClick={vi.fn()} onPricingClick={vi.fn()} />);
    const dashboard = screen.getByAltText(/Rowan dashboard/i);
    // `sizes` caps the served srcset variant to the real render width; without it
    // next/image assumes 100vw and ships a 1920w/3840w upscale as the LCP download.
    expect(dashboard.getAttribute('sizes')).toBe('(min-width: 1024px) 680px, 100vw');
    // `priority` emits the <link rel=preload as=image> so the LCP image is
    // discovered in the initial document instead of after the bundle.
    expect(dashboard.getAttribute('data-priority')).toBe('true');
  });

  it('never starts an above-fold entrance at opacity:0 (LCP element must paint immediately)', () => {
    render(<HeroSection onSignupClick={vi.fn()} onPricingClick={vi.fn()} />);
    expect(motionInitials.length).toBeGreaterThan(0);
    // Framer renders `initial` into the SSR HTML; an opacity:0 start paints the
    // headline + hero image invisible until JS hydrates, gating LCP on the bundle.
    // The entrance may translate (y) but must never fade from transparent.
    for (const initial of motionInitials) {
      expect(initial).not.toHaveProperty('opacity', 0);
    }
  });
});
