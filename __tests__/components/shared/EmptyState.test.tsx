// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      const Component = ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) =>
        React.createElement(String(prop), props, children);
      return Component;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { EmptyState } from '@/components/shared/EmptyState';

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with feature prop', () => {
    const { container } = render(<EmptyState feature="tasks" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders without crashing with custom props', () => {
    const { container } = render(
      <EmptyState title="Nothing here" description="Add something to get started" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('displays custom title', () => {
    render(<EmptyState title="Nothing here" description="Start adding items" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('displays custom description', () => {
    render(<EmptyState title="Empty" description="No items yet" />);
    expect(screen.getByText('No items yet')).toBeTruthy();
  });

  it('displays feature-specific title for tasks', () => {
    render(<EmptyState feature="tasks" />);
    expect(screen.getByText('Your task list is empty')).toBeTruthy();
  });

  it('displays feature-specific title for shopping', () => {
    render(<EmptyState feature="shopping" />);
    expect(screen.getByText('No shopping lists')).toBeTruthy();
  });

  it('renders action button when action prop is provided', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" description="No items" action={{ label: 'Add Item', onClick }} />);
    expect(screen.getByText('Add Item')).toBeTruthy();
  });

  it('calls action handler when action button is clicked', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" description="No items" action={{ label: 'Add Item', onClick }} />);
    fireEvent.click(screen.getByText('Add Item'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders feature default action button', () => {
    render(<EmptyState feature="tasks" />);
    expect(screen.getByText('Create a Task')).toBeTruthy();
  });
});
