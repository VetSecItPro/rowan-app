// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableMessageCard } from '@/components/messages/SwipeableMessageCard';

describe('SwipeableMessageCard', () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  const defaultProps = {
    isOwn: true,
    onEdit,
    onDelete,
    children: React.createElement('div', { 'data-testid': 'message-content' }, 'Test message'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<SwipeableMessageCard {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders children', () => {
    render(<SwipeableMessageCard {...defaultProps} />);
    expect(screen.getByTestId('message-content')).toBeTruthy();
    expect(screen.getByText('Test message')).toBeTruthy();
  });

  it('renders for non-own messages', () => {
    const { container } = render(
      <SwipeableMessageCard {...defaultProps} isOwn={false} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders without onEdit prop', () => {
    const { container } = render(
      <SwipeableMessageCard isOwn={false} onDelete={onDelete}>
        <div>Message</div>
      </SwipeableMessageCard>
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders without onDelete prop', () => {
    const { container } = render(
      <SwipeableMessageCard isOwn={true} onEdit={onEdit}>
        <div>Message</div>
      </SwipeableMessageCard>
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('handles touch start event without crashing', () => {
    render(<SwipeableMessageCard {...defaultProps} />);
    const container = screen.getByTestId('message-content').closest('div');
    if (container) {
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100 }],
      });
    }
    expect(screen.getByText('Test message')).toBeTruthy();
  });

  it('handles touch move and end without crashing', () => {
    render(<SwipeableMessageCard {...defaultProps} />);
    const container = screen.getByTestId('message-content').closest('div');
    if (container) {
      fireEvent.touchStart(container, { touches: [{ clientX: 100 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 60 }] });
      fireEvent.touchEnd(container);
    }
    expect(screen.getByText('Test message')).toBeTruthy();
  });
});
