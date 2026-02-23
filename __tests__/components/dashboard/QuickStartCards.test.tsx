// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
       
      const { variants, initial, animate, whileInView, viewport, exit, ...rest } = props as Record<string, unknown>;
      return React.createElement(tag as string, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

import { QuickStartCards } from '@/components/dashboard/QuickStartCards';

describe('QuickStartCards', () => {
  it('renders without crashing', () => {
    const { container } = render(<QuickStartCards />);
    expect(container).toBeTruthy();
  });

  it('shows Get Started heading', () => {
    render(<QuickStartCards />);
    expect(screen.getByText('Get Started')).toBeTruthy();
  });

  it('shows all four quick start cards', () => {
    render(<QuickStartCards />);
    expect(screen.getByText('Create your first task')).toBeTruthy();
    expect(screen.getByText("Plan this week's meals")).toBeTruthy();
    expect(screen.getByText('Set up your budget')).toBeTruthy();
    expect(screen.getByText('Invite your family')).toBeTruthy();
  });

  it('shows card descriptions', () => {
    render(<QuickStartCards />);
    expect(screen.getByText('Stay on top of what needs to get done')).toBeTruthy();
    expect(screen.getByText('Organize recipes and meal prep')).toBeTruthy();
    expect(screen.getByText('Track spending and save more')).toBeTruthy();
    expect(screen.getByText('Collaborate in real-time')).toBeTruthy();
  });

  it('navigates to tasks when first card clicked', () => {
    render(<QuickStartCards />);
    const card = screen.getByText('Create your first task').closest('button');
    expect(card).toBeTruthy();
    if (card) fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith('/tasks');
  });

  it('navigates to meals when meals card clicked', () => {
    render(<QuickStartCards />);
    const card = screen.getByText("Plan this week's meals").closest('button');
    expect(card).toBeTruthy();
    if (card) fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith('/meals');
  });

  it('navigates to budget when budget card clicked', () => {
    render(<QuickStartCards />);
    const card = screen.getByText('Set up your budget').closest('button');
    expect(card).toBeTruthy();
    if (card) fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith('/budget');
  });
});
