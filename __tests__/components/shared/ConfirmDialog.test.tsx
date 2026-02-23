// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/EnhancedButton', () => ({
  SecondaryButton: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  CTAButton: ({ children, onClick, disabled, icon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; icon?: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{icon}{children}</button>
  ),
}));

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays the title', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete Item')).toBeTruthy();
  });

  it('displays the message', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders Confirm button', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when Confirm is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders custom confirm and cancel labels', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Delete" cancelLabel="Keep" />);
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.getByText('Keep')).toBeTruthy();
  });

  it('applies danger variant', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} variant="danger" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has role alertdialog', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });
});
