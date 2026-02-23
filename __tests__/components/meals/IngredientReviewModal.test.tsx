// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IngredientReviewModal } from '@/components/meals/IngredientReviewModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));

describe('IngredientReviewModal', () => {
  const ingredients = ['2 cups pasta', '1 lb beef', '1 can tomato sauce'];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ingredients,
    recipeName: 'Bolognese',
  };

  it('renders without crashing when closed', () => {
    const { container } = render(<IngredientReviewModal {...defaultProps} isOpen={false} />);
    expect(container).toBeTruthy();
  });

  it('renders the modal title with recipe name', () => {
    render(<IngredientReviewModal {...defaultProps} />);
    expect(screen.getByText(/review ingredients - bolognese/i)).toBeTruthy();
  });

  it('renders all ingredients', () => {
    render(<IngredientReviewModal {...defaultProps} />);
    expect(screen.getByText('2 cups pasta')).toBeTruthy();
    expect(screen.getByText('1 lb beef')).toBeTruthy();
    expect(screen.getByText('1 can tomato sauce')).toBeTruthy();
  });

  it('shows selected count', () => {
    render(<IngredientReviewModal {...defaultProps} />);
    expect(screen.getByText(`${ingredients.length} of ${ingredients.length} selected`)).toBeTruthy();
  });

  it('shows Select All and Clear buttons', () => {
    render(<IngredientReviewModal {...defaultProps} />);
    expect(screen.getByText('Select All')).toBeTruthy();
    expect(screen.getByText('Clear')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<IngredientReviewModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onConfirm with selected ingredients when Add button clicked', () => {
    const onConfirm = vi.fn();
    render(<IngredientReviewModal {...defaultProps} onConfirm={onConfirm} />);
    // All selected by default, click Add
    const addBtn = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addBtn);
    expect(onConfirm).toHaveBeenCalledWith(expect.arrayContaining(ingredients));
  });

  it('deselects all when Clear is clicked', () => {
    render(<IngredientReviewModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText('0 of 3 selected')).toBeTruthy();
  });

  it('toggles ingredient selection when clicked', () => {
    render(<IngredientReviewModal {...defaultProps} />);
    // Click first ingredient to deselect
    fireEvent.click(screen.getByText('2 cups pasta'));
    expect(screen.getByText('2 of 3 selected')).toBeTruthy();
  });
});
