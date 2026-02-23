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

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test' },
  })),
}));

vi.mock('@/lib/services/task-recurrence-service', () => ({
  taskRecurrenceService: {
    createRecurrence: vi.fn().mockResolvedValue({}),
  },
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

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { NewTaskModal } from '@/components/tasks/NewTaskModal';

describe('NewTaskModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    spaceId: 'space-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(<NewTaskModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    render(<NewTaskModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('renders modal title for new task', () => {
    render(<NewTaskModal {...defaultProps} />);
    // Actual title is "Create New Task" not "New Task"
    expect(screen.getByText('Create New Task')).toBeDefined();
  });

  it('renders task title input field', () => {
    render(<NewTaskModal {...defaultProps} />);
    // Actual placeholder is "e.g., Complete project report"
    expect(screen.getByTestId('task-title-input')).toBeDefined();
  });
});
