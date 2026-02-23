// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/validations/bills', () => ({
  safeValidateCreateBill: vi.fn(() => ({ success: true, data: {}, error: null })),
}));

vi.mock('@/components/ui/EnhancedButton', () => ({
  CTAButton: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) =>
    React.createElement('button', { onClick, disabled }, children),
  SecondaryButton: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) =>
    React.createElement('button', { onClick }, children),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, title, isOpen }: React.PropsWithChildren<{ title?: string; isOpen?: boolean }>) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'modal' }, [
          React.createElement('h2', { key: 'title' }, title),
          children,
        ])
      : null,
}));

describe('NewBillModal', () => {
  it('renders without crashing when closed', async () => {
    const { NewBillModal } = await import('@/components/projects/NewBillModal');
    const { container } = render(
      <NewBillModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal when open', async () => {
    const { NewBillModal } = await import('@/components/projects/NewBillModal');
    render(<NewBillModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />);
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders Bill Name input label', async () => {
    const { NewBillModal } = await import('@/components/projects/NewBillModal');
    render(<NewBillModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />);
    expect(screen.getByText(/bill name/i)).toBeTruthy();
  });

  it('renders Amount input label', async () => {
    const { NewBillModal } = await import('@/components/projects/NewBillModal');
    render(<NewBillModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />);
    expect(screen.getByText(/amount/i)).toBeTruthy();
  });

  it('renders Due Date input label', async () => {
    const { NewBillModal } = await import('@/components/projects/NewBillModal');
    render(<NewBillModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />);
    expect(screen.getByText(/due date/i)).toBeTruthy();
  });
});
