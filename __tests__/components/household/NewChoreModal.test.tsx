// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewChoreModal } from '@/components/household/NewChoreModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title, footer }: { children: React.ReactNode; isOpen: boolean; title: string; footer?: React.ReactNode; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    );
  },
}));

describe('NewChoreModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose,
    onSave,
    spaceId: 'space-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<NewChoreModal {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when closed', () => {
    const { container } = render(<NewChoreModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "New Chore" title when creating', () => {
    render(<NewChoreModal {...defaultProps} />);
    expect(screen.getByText('New Chore')).toBeTruthy();
  });

  it('shows "Edit Chore" title when editing', () => {
    const editChore = {
      id: 'chore-1', space_id: 'space-1', title: 'Existing chore', description: 'desc',
      frequency: 'weekly' as const, status: 'pending' as const, due_date: null,
      created_by: 'user-1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', assigned_to: null,
    };
    render(<NewChoreModal {...defaultProps} editChore={editChore} />);
    expect(screen.getByText('Edit Chore')).toBeTruthy();
  });

  it('renders a title text input', () => {
    render(<NewChoreModal {...defaultProps} />);
    // The label "Title *" exists, the input is found by type
    const inputs = document.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('renders frequency select', () => {
    render(<NewChoreModal {...defaultProps} />);
    const select = screen.getAllByRole('combobox')[0];
    expect(select).toBeTruthy();
  });

  it('renders frequency options', () => {
    render(<NewChoreModal {...defaultProps} />);
    expect(screen.getByText('Daily')).toBeTruthy();
    expect(screen.getByText('Weekly')).toBeTruthy();
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('Once')).toBeTruthy();
  });

  it('renders cancel button', () => {
    render(<NewChoreModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders create button when creating', () => {
    render(<NewChoreModal {...defaultProps} />);
    expect(screen.getByText('Create')).toBeTruthy();
  });

  it('renders save button when editing', () => {
    const editChore = {
      id: 'chore-1', space_id: 'space-1', title: 'Old title', description: '',
      frequency: 'weekly' as const, status: 'pending' as const, due_date: null,
      created_by: 'user-1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', assigned_to: null,
    };
    render(<NewChoreModal {...defaultProps} editChore={editChore} />);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<NewChoreModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSave when form is submitted', async () => {
    onSave.mockResolvedValue(undefined);
    render(<NewChoreModal {...defaultProps} />);
    const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'New chore title' } });
    const form = document.getElementById('new-chore-form') as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const callArg = onSave.mock.calls[0][0];
    expect(callArg.title).toBe('New chore title');
    expect(callArg.space_id).toBe('space-1');
  });

  it('pre-fills title when editing', () => {
    const editChore = {
      id: 'chore-1', space_id: 'space-1', title: 'Pre-filled title', description: '',
      frequency: 'daily' as const, status: 'pending' as const, due_date: null,
      created_by: 'user-1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', assigned_to: null,
    };
    render(<NewChoreModal {...defaultProps} editChore={editChore} />);
    const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(titleInput.value).toBe('Pre-filled title');
  });
});
