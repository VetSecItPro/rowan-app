// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingCarousel } from '@/components/onboarding/OnboardingCarousel';

// Mock localStorage - OnboardingCarousel reads it to check if already completed
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null), // null = not completed, so carousel should show
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  });
});

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('OnboardingCarousel', () => {
  it('renders without crashing', () => {
    const { container } = render(<OnboardingCarousel onComplete={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  it('shows the first slide title', () => {
    render(<OnboardingCarousel onComplete={vi.fn()} />);
    expect(screen.getByText('Welcome to Rowan')).toBeTruthy();
  });

  it('shows a Skip button', () => {
    render(<OnboardingCarousel onComplete={vi.fn()} />);
    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('calls onComplete when Skip is clicked', () => {
    const onComplete = vi.fn();
    render(<OnboardingCarousel onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Skip'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('shows slide navigation dots', () => {
    const { container } = render(<OnboardingCarousel onComplete={vi.fn()} />);
    // Dots are buttons for slide navigation
    const dots = container.querySelectorAll('button[aria-label]');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('shows Next button on first slide', () => {
    render(<OnboardingCarousel onComplete={vi.fn()} />);
    expect(screen.getByText('Next')).toBeTruthy();
  });

  it('advances to next slide when Next is clicked', () => {
    render(<OnboardingCarousel onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Your Command Center')).toBeTruthy();
  });

  it('returns null when onboarding is already completed', () => {
    const localStorageMock = window.localStorage as { getItem: ReturnType<typeof vi.fn> };
    localStorageMock.getItem.mockReturnValueOnce('true');
    const { container } = render(<OnboardingCarousel onComplete={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
