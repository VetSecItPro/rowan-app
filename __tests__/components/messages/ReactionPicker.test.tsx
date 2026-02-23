// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactionPicker } from '@/components/messages/ReactionPicker';

describe('ReactionPicker', () => {
  const onSelectEmoji = vi.fn();

  const defaultProps = {
    onSelectEmoji,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ReactionPicker {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the trigger button', () => {
    render(<ReactionPicker {...defaultProps} />);
    const button = screen.getByLabelText('Add reaction');
    expect(button).toBeTruthy();
  });

  it('does not show picker by default', () => {
    render(<ReactionPicker {...defaultProps} />);
    expect(screen.queryByTitle('React with ❤️')).toBeNull();
  });

  it('opens picker when button is clicked', () => {
    render(<ReactionPicker {...defaultProps} />);
    const button = screen.getByLabelText('Add reaction');
    fireEvent.click(button);
    expect(screen.getByTitle('React with ❤️')).toBeTruthy();
  });

  it('calls onSelectEmoji when an emoji is clicked', () => {
    render(<ReactionPicker {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Add reaction'));
    fireEvent.click(screen.getByTitle('React with ❤️'));
    expect(onSelectEmoji).toHaveBeenCalledWith('❤️');
  });

  it('closes picker after emoji selection', () => {
    render(<ReactionPicker {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Add reaction'));
    fireEvent.click(screen.getByTitle('React with ❤️'));
    expect(screen.queryByTitle('React with 👍')).toBeNull();
  });

  it('closes picker when backdrop is clicked', () => {
    render(<ReactionPicker {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Add reaction'));
    expect(screen.getByTitle('React with ❤️')).toBeTruthy();
    // Click the backdrop (fixed inset-0)
    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    if (backdrop) fireEvent.click(backdrop);
    expect(screen.queryByTitle('React with ❤️')).toBeNull();
  });

  it('shows multiple emoji options', () => {
    render(<ReactionPicker {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Add reaction'));
    expect(screen.getByTitle('React with 👍')).toBeTruthy();
    expect(screen.getByTitle('React with 😂')).toBeTruthy();
    expect(screen.getByTitle('React with 🎉')).toBeTruthy();
  });

  it('accepts a custom className', () => {
    const { container } = render(
      <ReactionPicker {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
