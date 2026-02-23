// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { CheckInSuccess } from '@/components/checkins/CheckInSuccess';

describe('CheckInSuccess', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CheckInSuccess isOpen={false} onClose={onClose} mood="great" streak={3} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen is true', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={3} />);
    expect(screen.getByText('Check-In Complete!')).toBeInTheDocument();
  });

  it('renders the mood emoji for great', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={0} />);
    expect(screen.getByText('😊')).toBeInTheDocument();
  });

  it('renders the mood emoji for good', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="good" streak={0} />);
    expect(screen.getByText('🙂')).toBeInTheDocument();
  });

  it('renders the mood emoji for rough', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="rough" streak={0} />);
    expect(screen.getByText('😫')).toBeInTheDocument();
  });

  it('renders streak display when streak > 0', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={5} />);
    expect(screen.getByText('5 Day Streak!')).toBeInTheDocument();
  });

  it('does not render streak when streak is 0', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={0} />);
    expect(screen.queryByText(/Day Streak!/)).not.toBeInTheDocument();
  });

  it('renders 7-day milestone message', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={7} />);
    expect(screen.getByText(/One week milestone/)).toBeInTheDocument();
  });

  it('renders 30-day milestone message', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={30} />);
    expect(screen.getByText(/One month strong/)).toBeInTheDocument();
  });

  it('renders 100-day milestone message', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={100} />);
    expect(screen.getByText(/100 days/)).toBeInTheDocument();
  });

  it('renders the Continue button', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={3} />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('calls onClose when Continue button is clicked', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={3} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the Pro Tip section', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={3} />);
    expect(screen.getByText('Pro Tip:')).toBeInTheDocument();
  });

  it('auto-closes after 5 seconds', async () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="great" streak={3} />);
    vi.advanceTimersByTime(5000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders unknown mood with default emoji', () => {
    render(<CheckInSuccess isOpen={true} onClose={onClose} mood="unknown" streak={0} />);
    // Should fall back to 😊
    expect(screen.getByText('😊')).toBeInTheDocument();
  });
});
