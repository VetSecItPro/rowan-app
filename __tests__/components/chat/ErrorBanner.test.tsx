// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

import ErrorBanner from '@/components/chat/ErrorBanner';

describe('ErrorBanner', () => {
  const onDismiss = vi.fn();
  const onRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ErrorBanner message="Something went wrong" onDismiss={onDismiss} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders the error message', () => {
    render(<ErrorBanner message="Network timeout" onDismiss={onDismiss} />);
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });

  it('renders the dismiss button', () => {
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows retry button when onRetry is provided', () => {
    render(<ErrorBanner message="Error" onDismiss={onDismiss} onRetry={onRetry} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('does not show retry button when onRetry is not provided', () => {
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(<ErrorBanner message="Error" onDismiss={onDismiss} onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders with long error messages', () => {
    const longMessage = 'A'.repeat(200);
    render(<ErrorBanner message={longMessage} onDismiss={onDismiss} />);
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });
});
