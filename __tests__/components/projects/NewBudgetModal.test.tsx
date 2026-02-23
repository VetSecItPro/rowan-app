// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

describe('NewBudgetModal', () => {
  it('renders without crashing when closed', async () => {
    const { NewBudgetModal } = await import('@/components/projects/NewBudgetModal');
    const { container } = render(
      <NewBudgetModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal when open', async () => {
    const { NewBudgetModal } = await import('@/components/projects/NewBudgetModal');
    render(<NewBudgetModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />);
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders modal title', async () => {
    const { NewBudgetModal } = await import('@/components/projects/NewBudgetModal');
    render(<NewBudgetModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />);
    // Title is "Set Monthly Budget" when no currentBudget
    expect(screen.getByText('Set Monthly Budget')).toBeTruthy();
  });

  it('renders amount input', async () => {
    const { NewBudgetModal } = await import('@/components/projects/NewBudgetModal');
    render(<NewBudgetModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />);
    // Actual placeholder is "5000.00"
    const input = screen.getByPlaceholderText('5000.00');
    expect(input).toBeTruthy();
  });

  it('renders Set Budget button', async () => {
    const { NewBudgetModal } = await import('@/components/projects/NewBudgetModal');
    render(<NewBudgetModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />);
    // Button says "Set Budget" for new budget
    expect(screen.getByRole('button', { name: /set budget/i })).toBeTruthy();
  });

  it('calls onSave with budget amount when form is submitted', async () => {
    const onSave = vi.fn();
    const { NewBudgetModal } = await import('@/components/projects/NewBudgetModal');
    render(<NewBudgetModal isOpen={true} onClose={vi.fn()} onSave={onSave} spaceId="space-1" />);
    const input = screen.getByPlaceholderText('5000.00');
    fireEvent.change(input, { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: /set budget/i }));
    expect(onSave).toHaveBeenCalledWith(3000);
  });

  it('pre-populates with currentBudget when provided', async () => {
    const { NewBudgetModal } = await import('@/components/projects/NewBudgetModal');
    render(<NewBudgetModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" currentBudget={2500} />);
    const input = screen.getByPlaceholderText('5000.00') as HTMLInputElement;
    expect(input.value).toBe('2500');
  });
});
