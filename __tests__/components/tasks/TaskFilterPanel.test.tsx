// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TaskFilterPanel } from '@/components/tasks/TaskFilterPanel';

describe('TaskFilterPanel', () => {
  const defaultProps = {
    spaceId: 'space-1',
    onFilterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TaskFilterPanel {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeDefined();
  });

  it('renders collapsed by default', () => {
    render(<TaskFilterPanel {...defaultProps} />);
    expect(screen.queryByText('Search')).toBeNull();
  });

  it('expands when header is clicked', async () => {
    render(<TaskFilterPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tasks...')).toBeDefined();
    });
  });

  it('shows status filter buttons when expanded', async () => {
    render(<TaskFilterPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeDefined();
      expect(screen.getByText('Completed')).toBeDefined();
      expect(screen.getByText('Blocked')).toBeDefined();
    });
  });

  it('shows priority filter buttons when expanded', async () => {
    render(<TaskFilterPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => {
      expect(screen.getByText('Urgent')).toBeDefined();
      expect(screen.getByText('High')).toBeDefined();
      expect(screen.getByText('Medium')).toBeDefined();
      expect(screen.getByText('Low')).toBeDefined();
    });
  });

  it('calls onFilterChange on mount', () => {
    render(<TaskFilterPanel {...defaultProps} />);
    expect(defaultProps.onFilterChange).toHaveBeenCalled();
  });
});
