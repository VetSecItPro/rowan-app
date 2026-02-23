// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({
    children,
    title,
    isOpen,
    footer,
  }: React.PropsWithChildren<{ title?: string; isOpen?: boolean; footer?: React.ReactNode }>) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'modal' }, [
          React.createElement('h2', { key: 'title' }, title),
          children,
          footer,
        ])
      : null,
}));

describe('NewChoreModal', () => {
  it('renders without crashing when closed', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    const { container } = render(
      <NewChoreModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal when open', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
      />
    );
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders New Chore title', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
      />
    );
    expect(screen.getByText(/new chore/i)).toBeTruthy();
  });

  it('renders Chore Title input label', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
      />
    );
    expect(screen.getByText(/chore title/i)).toBeTruthy();
  });

  it('renders Frequency label', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
      />
    );
    expect(screen.getByText(/frequency/i)).toBeTruthy();
  });

  it('renders Create Chore button', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
      />
    );
    expect(screen.getByRole('button', { name: /create chore/i })).toBeTruthy();
  });

  it('renders Cancel button', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
      />
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
  });

  it('shows Edit Chore title and Update Chore button when editChore provided', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    const editChore = {
      id: 'chore-1',
      space_id: 'space-1',
      title: 'Wash dishes',
      description: null,
      status: 'pending' as const,
      frequency: 'daily' as const,
      assigned_to: null,
      due_date: null,
      completion_percentage: 0,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
        editChore={editChore}
      />
    );
    expect(screen.getByText(/edit chore/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /update chore/i })).toBeTruthy();
  });

  it('pre-populates title when editChore is provided', async () => {
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    const editChore = {
      id: 'chore-2',
      space_id: 'space-1',
      title: 'Mow the lawn',
      description: null,
      status: 'pending' as const,
      frequency: 'weekly' as const,
      assigned_to: null,
      due_date: null,
      completion_percentage: 0,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        userId="user-1"
        editChore={editChore}
      />
    );
    const input = screen.getByPlaceholderText(/e.g., Clean the kitchen/i) as HTMLInputElement;
    expect(input.value).toBe('Mow the lawn');
  });

  it('calls onSave when form is submitted', async () => {
    const onSave = vi.fn();
    const { NewChoreModal } = await import('@/components/projects/NewChoreModal');
    render(
      <NewChoreModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
        spaceId="space-1"
        userId="user-1"
      />
    );
    const titleInput = screen.getByPlaceholderText(/e.g., Clean the kitchen/i);
    fireEvent.change(titleInput, { target: { value: 'Take out trash' } });
    fireEvent.click(screen.getByRole('button', { name: /create chore/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Take out trash' })
    );
  });
});
