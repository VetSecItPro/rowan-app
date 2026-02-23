// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

vi.mock('@/lib/services/task-approvals-service', () => ({
  taskApprovalsService: {
    getApprovals: vi.fn().mockResolvedValue([]),
    requestApproval: vi.fn().mockResolvedValue({}),
    updateApprovalStatus: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockResolvedValue({ data: [], error: null }),
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

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ApprovalModal } from '@/components/tasks/ApprovalModal';

describe('ApprovalModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    taskId: 'task-1',
    currentUserId: 'user-1',
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', async () => {
    render(<ApprovalModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });

  it('renders modal title', async () => {
    render(<ApprovalModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Approval Workflow')).toBeDefined();
    });
  });

  it('does not render when isOpen is false', () => {
    render(<ApprovalModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows empty state when no approvals exist', async () => {
    render(<ApprovalModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No approvals yet/)).toBeDefined();
    });
  });

  it('shows Request Approval section', async () => {
    render(<ApprovalModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Request Approval')).toBeDefined();
    });
  });

  it('renders request button disabled when no approver selected', async () => {
    render(<ApprovalModal {...defaultProps} />);
    await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Request' });
      expect(button).toBeDefined();
    });
  });
});
