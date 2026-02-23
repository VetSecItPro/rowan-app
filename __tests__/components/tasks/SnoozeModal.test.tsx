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

vi.mock('@/lib/services/task-snooze-service', () => ({
  taskSnoozeService: {
    getSnoozeHistory: vi.fn().mockResolvedValue([]),
    snoozeTask: vi.fn().mockResolvedValue({}),
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

import { SnoozeModal } from '@/components/tasks/SnoozeModal';

describe('SnoozeModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    taskId: 'task-1',
    userId: 'user-1',
    onSnooze: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', async () => {
    render(<SnoozeModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });

  it('renders modal title', () => {
    render(<SnoozeModal {...defaultProps} />);
    expect(screen.getByText('Snooze Task')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    render(<SnoozeModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows quick snooze options', () => {
    render(<SnoozeModal {...defaultProps} />);
    expect(screen.getByText('Quick Snooze')).toBeDefined();
    expect(screen.getByText('1 Hour')).toBeDefined();
    expect(screen.getByText('3 Hours')).toBeDefined();
    expect(screen.getByText('Next Monday')).toBeDefined();
  });

  it('shows custom date and time inputs', () => {
    render(<SnoozeModal {...defaultProps} />);
    expect(screen.getByText('Custom Date & Time')).toBeDefined();
    expect(screen.getByText('Set Custom Snooze')).toBeDefined();
  });

  it('shows snooze history toggle button', () => {
    render(<SnoozeModal {...defaultProps} />);
    expect(screen.getByText('Show Snooze History')).toBeDefined();
  });
});
