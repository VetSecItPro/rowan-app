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

vi.mock('@/lib/services/task-attachments-service', () => ({
  taskAttachmentsService: {
    getAttachments: vi.fn().mockResolvedValue([]),
    uploadAttachment: vi.fn().mockResolvedValue({}),
    getAttachmentUrl: vi.fn().mockResolvedValue('http://example.com/file'),
    deleteAttachment: vi.fn().mockResolvedValue({}),
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

vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="confirm-dialog">{title}</div> : null,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AttachmentsModal } from '@/components/tasks/AttachmentsModal';

describe('AttachmentsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    taskId: 'task-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', async () => {
    render(<AttachmentsModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });

  it('renders modal title', async () => {
    render(<AttachmentsModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Attachments')).toBeDefined();
    });
  });

  it('does not render when isOpen is false', () => {
    render(<AttachmentsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows empty state when no attachments', async () => {
    render(<AttachmentsModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('No attachments yet')).toBeDefined();
    });
  });

  it('shows upload area', async () => {
    render(<AttachmentsModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Click to upload file/)).toBeDefined();
    });
  });
});
