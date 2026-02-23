// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
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

vi.mock('@/lib/utils/ingredient-simplifier', () => ({
  simplifyIngredients: vi.fn((ingredients: unknown[]) =>
    ingredients.map((ing) => {
      const originalText = typeof ing === 'string' ? ing : String(ing);
      return {
        original: originalText,
        simplified: originalText,
        selected: true,
      };
    })
  ),
}));

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    createList: vi.fn().mockResolvedValue({ id: 'list-1' }),
    createItem: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/services/tasks-service', () => ({
  tasksService: {
    createTask: vi.fn().mockResolvedValue({ id: 'task-1' }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ShoppingListPreviewModal } from '@/components/meals/ShoppingListPreviewModal';

describe('ShoppingListPreviewModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose,
    ingredients: ['200g spaghetti', '100g pancetta', '2 eggs'],
    recipeName: 'Pasta Carbonara',
    spaceId: 'space-1',
    onSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<ShoppingListPreviewModal {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when closed', () => {
    const { container } = render(<ShoppingListPreviewModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the modal title', () => {
    render(<ShoppingListPreviewModal {...defaultProps} />);
    expect(screen.getByRole('heading')).toBeTruthy();
  });

  it('displays ingredients after effect runs', async () => {
    render(<ShoppingListPreviewModal {...defaultProps} />);
    await waitFor(() => {
      // Items appear after useEffect sets simplifiedItems
      const items = screen.queryAllByText('200g spaghetti');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('renders cancel button', () => {
    render(<ShoppingListPreviewModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onClose when cancel is clicked', () => {
    render(<ShoppingListPreviewModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders with pre-filled list name from recipe name', async () => {
    render(<ShoppingListPreviewModal {...defaultProps} />);
    await waitFor(() => {
      const listNameInput = screen.queryByDisplayValue('Pasta Carbonara Shopping');
      expect(listNameInput).toBeTruthy();
    });
  });

  it('handles empty ingredients list gracefully', () => {
    const { container } = render(
      <ShoppingListPreviewModal {...defaultProps} ingredients={[]} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders select all controls', () => {
    render(<ShoppingListPreviewModal {...defaultProps} />);
    expect(screen.getByText('Select All')).toBeTruthy();
  });
});
