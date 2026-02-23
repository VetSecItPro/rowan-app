// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewMealModal } from '@/components/meals/NewMealModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));

vi.mock('@/components/meals/ShoppingListPreviewModal', () => ({
  ShoppingListPreviewModal: () => null,
}));

vi.mock('@/components/ui/EnhancedButton', () => ({
  CTAButton: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('button', props, children),
  SecondaryButton: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('button', props, children),
}));

describe('NewMealModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    spaceId: 'space-1',
    recipes: [],
  };

  it('renders without crashing when closed', () => {
    const { container } = render(<NewMealModal {...defaultProps} isOpen={false} />);
    expect(container).toBeTruthy();
  });

  it('renders the modal title when open', () => {
    render(<NewMealModal {...defaultProps} />);
    expect(screen.getByText('Plan New Meal')).toBeTruthy();
  });

  it('shows Edit Meal title when editing', () => {
    const editMeal = {
      id: 'meal-1',
      space_id: 'space-1',
      name: 'Old Dinner',
      meal_type: 'dinner' as const,
      scheduled_date: '2026-01-01',
      notes: null,
      recipe_id: null,
      recipe: null,
      assignee: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    render(<NewMealModal {...defaultProps} editMeal={editMeal} />);
    expect(screen.getByText('Edit Meal')).toBeTruthy();
  });

  it('shows Meal Type label', () => {
    render(<NewMealModal {...defaultProps} />);
    expect(screen.getByText(/meal type/i)).toBeTruthy();
  });

  it('shows Create button', () => {
    render(<NewMealModal {...defaultProps} />);
    expect(screen.getByText('Create')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<NewMealModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<NewMealModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty recipe message when no recipes', () => {
    render(<NewMealModal {...defaultProps} />);
    const recipeBtn = screen.getByText('No recipe selected');
    expect(recipeBtn).toBeTruthy();
  });
});
