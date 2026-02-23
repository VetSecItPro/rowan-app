// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showWarning: vi.fn(),
}));

vi.mock('@/lib/services/task-dependencies-service', () => ({
  taskDependenciesService: {
    getDependencies: vi.fn().mockResolvedValue([]),
    addDependency: vi.fn().mockResolvedValue({}),
    removeDependency: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock('use-debounce', () => ({
  useDebounce: (value: unknown) => [value],
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { DependenciesModal } from '@/components/tasks/DependenciesModal';

describe('DependenciesModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    taskId: 'task-1',
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', async () => {
    render(<DependenciesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });

  it('renders modal title', async () => {
    render(<DependenciesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Task Dependencies')).toBeDefined();
    });
  });

  it('does not render when isOpen is false', () => {
    render(<DependenciesModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows empty state when no dependencies exist', async () => {
    render(<DependenciesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No dependencies yet/)).toBeDefined();
    });
  });

  it('shows Add Dependency section', async () => {
    render(<DependenciesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Add Dependency')).toBeDefined();
    });
  });

  it('shows Blocks and Relates To dependency type buttons', async () => {
    render(<DependenciesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Blocks')).toBeDefined();
      expect(screen.getByText('Relates To')).toBeDefined();
    });
  });

  it('shows circular dependency warning', async () => {
    render(<DependenciesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Circular dependencies are automatically prevented/)).toBeDefined();
    });
  });
});
