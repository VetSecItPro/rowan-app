// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Chore } from '@/lib/types';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, title, isOpen, footer }: React.PropsWithChildren<{ title?: string; isOpen?: boolean; footer?: React.ReactNode }>) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'modal' }, [
          React.createElement('h2', { key: 'title' }, title),
          children,
          footer,
        ])
      : null,
}));

const chore: Chore = {
  id: 'chore-1',
  space_id: 'space-1',
  title: 'Mow the lawn',
  description: null,
  status: 'pending',
  frequency: 'weekly',
  assigned_to: null,
  due_date: null,
  completion_percentage: 40,
  notes: 'Half done',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('UpdateProgressModal', () => {
  it('renders without crashing when closed', async () => {
    const { UpdateProgressModal } = await import('@/components/projects/UpdateProgressModal');
    const { container } = render(
      <UpdateProgressModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} chore={chore} />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal with chore content when open', async () => {
    const { UpdateProgressModal } = await import('@/components/projects/UpdateProgressModal');
    render(<UpdateProgressModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} chore={chore} />);
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders completion percentage input', async () => {
    const { UpdateProgressModal } = await import('@/components/projects/UpdateProgressModal');
    render(<UpdateProgressModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} chore={chore} />);
    expect(screen.getByText(/completion/i)).toBeTruthy();
  });

  it('renders Update Progress button in footer', async () => {
    const { UpdateProgressModal } = await import('@/components/projects/UpdateProgressModal');
    render(<UpdateProgressModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} chore={chore} />);
    // Both h2 title and button say "Update Progress" — find the button specifically
    const elements = screen.getAllByText('Update Progress');
    const button = elements.find(el => el.tagName === 'BUTTON');
    expect(button).toBeTruthy();
  });

  it('renders null content when chore is null', async () => {
    const { UpdateProgressModal } = await import('@/components/projects/UpdateProgressModal');
    render(
      <UpdateProgressModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} chore={null} />
    );
    expect(screen.queryByText(/completion/i)).toBeNull();
  });
});
