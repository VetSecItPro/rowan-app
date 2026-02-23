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

vi.mock('@/lib/services/chore-rotation-service', () => ({
  choreRotationService: {
    getRotation: vi.fn().mockResolvedValue(null),
    createRotation: vi.fn().mockResolvedValue({}),
    updateRotation: vi.fn().mockResolvedValue({}),
    deleteRotation: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));

vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="confirm-dialog">{title}</div> : null,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ChoreRotationConfig } from '@/components/tasks/ChoreRotationConfig';

describe('ChoreRotationConfig', () => {
  const defaultProps = {
    taskId: 'task-1',
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const { container } = render(<ChoreRotationConfig {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('shows loading state initially', () => {
    render(<ChoreRotationConfig {...defaultProps} />);
    expect(screen.getByText('Loading rotation config...')).toBeDefined();
  });

  it('shows Chore Rotation header after loading', async () => {
    render(<ChoreRotationConfig {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Chore Rotation')).toBeDefined();
    });
  });

  it('shows rotation type options when no rotation exists', async () => {
    render(<ChoreRotationConfig {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Round Robin')).toBeDefined();
      expect(screen.getByText('Random')).toBeDefined();
    });
  });

  it('shows Create Rotation button when no rotation exists', async () => {
    render(<ChoreRotationConfig {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Create Rotation')).toBeDefined();
    });
  });

  it('shows how it works info panel', async () => {
    render(<ChoreRotationConfig {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/How it works/)).toBeDefined();
    });
  });
});
