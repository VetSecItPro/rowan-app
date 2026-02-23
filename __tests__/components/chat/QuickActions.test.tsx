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

import QuickActions from '@/components/chat/QuickActions';

describe('QuickActions', () => {
  const onSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<QuickActions onSend={onSend} />);
    expect(document.body).toBeTruthy();
  });

  it('renders action buttons', () => {
    render(<QuickActions onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders exactly 4 action buttons', () => {
    render(<QuickActions onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
  });

  it('calls onSend with message when button is clicked', () => {
    render(<QuickActions onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(typeof onSend.mock.calls[0][0]).toBe('string');
  });

  it('sends a non-empty message', () => {
    render(<QuickActions onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSend.mock.calls[0][0].length).toBeGreaterThan(0);
  });

  it('renders buttons with text labels', () => {
    render(<QuickActions onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button.textContent?.length).toBeGreaterThan(0);
    });
  });

  it('renders a flex container', () => {
    const { container } = render(<QuickActions onSend={onSend} />);
    const flexDiv = container.querySelector('.flex');
    expect(flexDiv).toBeInTheDocument();
  });
});
