// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    createTemplate: vi.fn().mockResolvedValue({ id: 'tpl-1' }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showWarning: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
        {footer}
      </div>
    ) : null,
}));

import { CreateCustomTemplateModal } from '@/components/shopping/CreateCustomTemplateModal';

describe('CreateCustomTemplateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    const { container } = render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<CreateCustomTemplateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Create Custom Template title', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(screen.getByText('Create Custom Template')).toBeTruthy();
  });

  it('shows Template Name label', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(screen.getByText('Template Name *')).toBeTruthy();
  });

  it('shows Description label', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(screen.getByText('Description (optional)')).toBeTruthy();
  });

  it('shows Add Items label', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(screen.getByText('Add Items')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Save Template button', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(screen.getByText('Save Template')).toBeTruthy();
  });

  it('Save Template button is disabled when name is empty', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    const saveBtn = screen.getByText('Save Template').closest('button')!;
    expect(saveBtn.hasAttribute('disabled')).toBe(true);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<CreateCustomTemplateModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows placeholder text for template name', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('e.g., Weekly Groceries');
    expect(input).toBeTruthy();
  });

  it('shows empty items message when no items added', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(screen.getByText('Add items above to build your template')).toBeTruthy();
  });

  it('shows item name placeholder', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Item name')).toBeTruthy();
  });

  it('adds item to list when Add button is clicked with name', () => {
    render(<CreateCustomTemplateModal {...defaultProps} />);
    const itemInput = screen.getByPlaceholderText('Item name');
    fireEvent.change(itemInput, { target: { value: 'Milk' } });
    // Find the add button by the Plus icon button
    const addBtn = itemInput.parentElement?.querySelector('button') as HTMLButtonElement;
    fireEvent.click(addBtn);
    expect(screen.getByText('Milk')).toBeTruthy();
  });
});
