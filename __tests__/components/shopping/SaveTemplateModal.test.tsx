// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
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

import { SaveTemplateModal } from '@/components/shopping/SaveTemplateModal';

const mockList = {
  id: 'list-1',
  title: 'Weekly Groceries',
  description: 'My grocery list',
  status: 'active' as const,
  space_id: 'space-1',
  created_at: '2026-01-01',
  items: [
    { id: 'item-1', name: 'Milk', quantity: 1, checked: false, list_id: 'list-1', sort_order: 0, created_at: '2026-01-01' },
    { id: 'item-2', name: 'Eggs', quantity: 12, checked: false, list_id: 'list-1', sort_order: 1, created_at: '2026-01-01' },
  ],
};

describe('SaveTemplateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    list: mockList,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    const { container } = render(<SaveTemplateModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<SaveTemplateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Save as Template title', () => {
    render(<SaveTemplateModal {...defaultProps} />);
    expect(screen.getByText('Save as Template')).toBeTruthy();
  });

  it('pre-fills template name with list title', () => {
    render(<SaveTemplateModal {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText('e.g., Weekly Groceries') as HTMLInputElement;
    expect(nameInput.value).toBe('Weekly Groceries');
  });

  it('pre-fills description with list description', () => {
    render(<SaveTemplateModal {...defaultProps} />);
    const descInput = screen.getByPlaceholderText('Describe this template...') as HTMLInputElement;
    expect(descInput.value).toBe('My grocery list');
  });

  it('shows Template Name label', () => {
    render(<SaveTemplateModal {...defaultProps} />);
    expect(screen.getByText('Template Name')).toBeTruthy();
  });

  it('shows Description label', () => {
    render(<SaveTemplateModal {...defaultProps} />);
    expect(screen.getByText('Description (Optional)')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<SaveTemplateModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Save Template button', () => {
    render(<SaveTemplateModal {...defaultProps} />);
    expect(screen.getByText('Save Template')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<SaveTemplateModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows tip text with item count', () => {
    render(<SaveTemplateModal {...defaultProps} />);
    expect(screen.getByText(/2 items from your current list/)).toBeTruthy();
  });
});
