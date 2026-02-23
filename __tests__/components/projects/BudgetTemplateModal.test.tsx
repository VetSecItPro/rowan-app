// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

const mockTemplates = [
  {
    id: 'tpl-1',
    name: 'Family Budget',
    description: 'Standard family budget template',
    household_type: 'family' as const,
    total_allocation_percentage: 100,
  },
];

describe('BudgetTemplateModal', () => {
  it('renders without crashing when closed', async () => {
    const { BudgetTemplateModal } = await import('@/components/projects/BudgetTemplateModal');
    const { container } = render(
      <BudgetTemplateModal isOpen={false} onClose={vi.fn()} onApply={vi.fn()} templates={mockTemplates} templateCategories={{}} />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal when open', async () => {
    const { BudgetTemplateModal } = await import('@/components/projects/BudgetTemplateModal');
    render(
      <BudgetTemplateModal isOpen={true} onClose={vi.fn()} onApply={vi.fn()} templates={mockTemplates} templateCategories={{}} />
    );
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders template names when open', async () => {
    const { BudgetTemplateModal } = await import('@/components/projects/BudgetTemplateModal');
    render(
      <BudgetTemplateModal isOpen={true} onClose={vi.fn()} onApply={vi.fn()} templates={mockTemplates} templateCategories={{}} />
    );
    expect(screen.getByText('Family Budget')).toBeTruthy();
  });

  it('renders monthly income input', async () => {
    const { BudgetTemplateModal } = await import('@/components/projects/BudgetTemplateModal');
    render(
      <BudgetTemplateModal isOpen={true} onClose={vi.fn()} onApply={vi.fn()} templates={mockTemplates} templateCategories={{}} />
    );
    // The placeholder is "5000" not "income"
    const input = screen.getByPlaceholderText('5000');
    expect(input).toBeTruthy();
  });
});
