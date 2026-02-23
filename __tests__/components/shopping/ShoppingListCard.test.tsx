// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
  })),
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn(() => 'Jan 1, 2026'),
}));

vi.mock('@/lib/constants/shopping-categories', () => ({
  getCategoryIcon: vi.fn((cat: string) => `[${cat}]`),
  getCategoryLabel: vi.fn((cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1)),
}));

vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/CircularProgress', () => ({
  CircularProgress: ({ progress }: { progress: number }) => <div data-testid="progress">{progress}%</div>,
}));

import { ShoppingListCard } from '@/components/shopping/ShoppingListCard';
import type { ShoppingList } from '@/lib/services/shopping-service';

const mockList: ShoppingList = {
  id: 'list-1',
  title: 'Weekly Groceries',
  description: 'Get essentials',
  store_name: 'Walmart',
  status: 'active',
  space_id: 'space-1',
  created_at: '2026-01-01',
  items: [
    { id: 'item-1', name: 'Milk', quantity: 1, checked: false, list_id: 'list-1', sort_order: 0, category: 'dairy', created_at: '2026-01-01' },
    { id: 'item-2', name: 'Eggs', quantity: 12, checked: true, list_id: 'list-1', sort_order: 1, category: 'dairy', created_at: '2026-01-01' },
  ],
};

describe('ShoppingListCard', () => {
  const defaultProps = {
    list: mockList,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ShoppingListCard {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays list title', () => {
    render(<ShoppingListCard {...defaultProps} />);
    expect(screen.getByText('Weekly Groceries')).toBeTruthy();
  });

  it('shows item count', () => {
    render(<ShoppingListCard {...defaultProps} />);
    expect(screen.getByText(/1 of 2 items/)).toBeTruthy();
  });

  it('shows store name', () => {
    render(<ShoppingListCard {...defaultProps} />);
    // Multiple elements may contain "Walmart" - just verify at least one exists
    const walmartElements = screen.getAllByText(/Walmart/);
    expect(walmartElements.length).toBeGreaterThan(0);
  });

  it('shows item names', () => {
    render(<ShoppingListCard {...defaultProps} />);
    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText('Eggs')).toBeTruthy();
  });

  it('shows status badge', () => {
    render(<ShoppingListCard {...defaultProps} />);
    expect(screen.getByText('active')).toBeTruthy();
  });

  it('shows timestamp', () => {
    render(<ShoppingListCard {...defaultProps} />);
    expect(screen.getByText('Jan 1, 2026')).toBeTruthy();
  });

  it('shows options menu button', () => {
    render(<ShoppingListCard {...defaultProps} />);
    const menuBtn = screen.getByLabelText('Shopping list options menu');
    expect(menuBtn).toBeTruthy();
  });

  it('opens options menu when menu button clicked', () => {
    render(<ShoppingListCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Shopping list options menu'));
    expect(screen.getByText('Edit List')).toBeTruthy();
    expect(screen.getByText('Delete List')).toBeTruthy();
  });

  it('calls onEdit when Edit List is clicked', () => {
    const onEdit = vi.fn();
    render(<ShoppingListCard {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText('Shopping list options menu'));
    fireEvent.click(screen.getByText('Edit List'));
    expect(onEdit).toHaveBeenCalledWith(mockList);
  });

  it('calls onDelete when Delete List is clicked', () => {
    const onDelete = vi.fn();
    render(<ShoppingListCard {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Shopping list options menu'));
    fireEvent.click(screen.getByText('Delete List'));
    expect(onDelete).toHaveBeenCalledWith('list-1');
  });

  it('shows Save as Template option when items exist and handler provided', () => {
    render(<ShoppingListCard {...defaultProps} onSaveAsTemplate={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Shopping list options menu'));
    expect(screen.getByText('Save as Template')).toBeTruthy();
  });

  it('shows description when present', () => {
    render(<ShoppingListCard {...defaultProps} />);
    expect(screen.getByText(/Get essentials/)).toBeTruthy();
  });

  it('renders progress indicator', () => {
    render(<ShoppingListCard {...defaultProps} />);
    expect(screen.getByTestId('progress')).toBeTruthy();
  });
});
