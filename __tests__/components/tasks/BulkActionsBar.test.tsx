// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null }),
  })),
}));

vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, title, onClose, onConfirm }: {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onConfirm: () => void;
  }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null,
}));

import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';

describe('BulkActionsBar', () => {
  const defaultProps = {
    selectedTaskIds: ['task-1', 'task-2'],
    onClearSelection: vi.fn(),
    onActionComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when tasks are selected', () => {
    render(<BulkActionsBar {...defaultProps} />);
    expect(screen.getByText('2 tasks selected')).toBeDefined();
  });

  it('returns null when no tasks selected', () => {
    const { container } = render(
      <BulkActionsBar {...defaultProps} selectedTaskIds={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows singular "task" for single selection', () => {
    render(<BulkActionsBar {...defaultProps} selectedTaskIds={['task-1']} />);
    expect(screen.getByText('1 task selected')).toBeDefined();
  });

  it('renders Complete and Delete action buttons', () => {
    render(<BulkActionsBar {...defaultProps} />);
    expect(screen.getByTitle('Mark as completed')).toBeDefined();
    expect(screen.getByTitle('Delete selected')).toBeDefined();
  });

  it('calls onClearSelection when X is clicked', () => {
    render(<BulkActionsBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Clear selection'));
    expect(defaultProps.onClearSelection).toHaveBeenCalledOnce();
  });

  it('shows More button for additional actions', () => {
    render(<BulkActionsBar {...defaultProps} />);
    expect(screen.getByText('More')).toBeDefined();
  });

  it('opens delete confirm dialog when Delete is clicked', () => {
    render(<BulkActionsBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Delete selected'));
    expect(screen.getByTestId('confirm-dialog')).toBeDefined();
  });

  it('shows More actions dropdown when More is clicked', () => {
    render(<BulkActionsBar {...defaultProps} />);
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText('Set Status')).toBeDefined();
    expect(screen.getByText('Set Priority')).toBeDefined();
  });
});
