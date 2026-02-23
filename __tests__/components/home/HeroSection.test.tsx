// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="remotion-player" />,
}));
vi.mock('@/remotion/compositions/HeroShowcase', () => ({ HeroShowcase: () => null }));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
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
});
