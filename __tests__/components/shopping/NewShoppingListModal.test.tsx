// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
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

vi.mock('@/components/ui/EnhancedButton', () => ({
  CTAButton: ({ children, loading, ...props }: { children: React.ReactNode; loading?: boolean; [key: string]: unknown }) => (
    <button {...props}>{loading ? 'Loading...' : children}</button>
  ),
  SecondaryButton: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/Dropdown', () => ({
  Dropdown: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
    </select>
  ),
}));

import { NewShoppingListModal } from '@/components/shopping/NewShoppingListModal';

describe('NewShoppingListModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    const { container } = render(<NewShoppingListModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<NewShoppingListModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays New Shopping List title when creating', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByText('New Shopping List')).toBeTruthy();
  });

  it('displays Edit Shopping List title when editing', () => {
    const editList = {
      id: 'list-1',
      title: 'My List',
      status: 'active' as const,
      space_id: 'space-1',
      created_at: '2026-01-01',
    };
    render(<NewShoppingListModal {...defaultProps} editList={editList} />);
    expect(screen.getByText('Edit Shopping List')).toBeTruthy();
  });

  it('shows Title label', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByText('Title *')).toBeTruthy();
  });

  it('shows Store label', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByText('Store')).toBeTruthy();
  });

  it('shows Budget label', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByText('Budget (Optional)')).toBeTruthy();
  });

  it('shows Description label', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByText('Description')).toBeTruthy();
  });

  it('shows Items label', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByText('Items')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Create Shopping List button when creating', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByText('Create Shopping List')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<NewShoppingListModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows title placeholder', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type a Title')).toBeTruthy();
  });

  it('shows Add item input', () => {
    render(<NewShoppingListModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Add an item...')).toBeTruthy();
  });

  it('shows Use a Template option when onUseTemplate is provided', () => {
    render(<NewShoppingListModal {...defaultProps} onUseTemplate={vi.fn()} />);
    expect(screen.getByText('Use a Template')).toBeTruthy();
  });
});
