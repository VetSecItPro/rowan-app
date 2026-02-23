// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPlanModal } from '@/components/meals/QuickPlanModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

describe('QuickPlanModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onPlan: vi.fn().mockResolvedValue(undefined),
    recipeName: 'Chicken Tikka',
  };

  it('renders without crashing when closed', () => {
    const { container } = render(<QuickPlanModal {...defaultProps} isOpen={false} />);
    expect(container).toBeTruthy();
  });

  it('renders modal title when open', () => {
    render(<QuickPlanModal {...defaultProps} />);
    expect(screen.getByText('Plan Meal')).toBeTruthy();
  });

  it('displays the recipe name', () => {
    render(<QuickPlanModal {...defaultProps} />);
    expect(screen.getByText('Chicken Tikka')).toBeTruthy();
  });

  it('shows all meal type options', () => {
    render(<QuickPlanModal {...defaultProps} />);
    expect(screen.getByText('Breakfast')).toBeTruthy();
    expect(screen.getByText('Lunch')).toBeTruthy();
    expect(screen.getByText('Dinner')).toBeTruthy();
    expect(screen.getByText('Snack')).toBeTruthy();
  });

  it('shows the date input', () => {
    render(<QuickPlanModal {...defaultProps} />);
    expect(screen.getByText(/when do you want this meal/i)).toBeTruthy();
  });

  it('shows shopping list checkbox', () => {
    render(<QuickPlanModal {...defaultProps} />);
    expect(screen.getByText(/add ingredients to shopping list/i)).toBeTruthy();
  });

  it('shows Cancel and Plan buttons', () => {
    render(<QuickPlanModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Plan')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<QuickPlanModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
