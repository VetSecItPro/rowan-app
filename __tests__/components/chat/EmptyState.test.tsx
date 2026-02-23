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

import EmptyState from '@/components/chat/EmptyState';

describe('EmptyState', () => {
  const onSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<EmptyState onSend={onSend} />);
    expect(document.body).toBeTruthy();
  });

  it('renders a greeting when userName is provided', () => {
    render(<EmptyState onSend={onSend} userName="Alice Smith" />);
    // Should include "Alice" in the greeting
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('renders generic greeting when no userName', () => {
    render(<EmptyState onSend={onSend} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<EmptyState onSend={onSend} />);
    expect(screen.getByText(/tasks, meals, calendar, budgets/i)).toBeInTheDocument();
  });

  it('renders suggestion chip buttons', () => {
    render(<EmptyState onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onSend with message when suggestion chip is clicked', () => {
    render(<EmptyState onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(typeof onSend.mock.calls[0][0]).toBe('string');
  });

  it('renders with null userName without crashing', () => {
    render(<EmptyState onSend={onSend} userName={null} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('renders with undefined userName without crashing', () => {
    render(<EmptyState onSend={onSend} userName={undefined} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('renders 4 suggestion chips', () => {
    render(<EmptyState onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);
  });
});
