// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageNotificationBell } from '@/components/messages/MessageNotificationBell';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('MessageNotificationBell', () => {
  const onBellClick = vi.fn();

  const defaultProps = {
    userId: 'user-1',
    spaceId: 'space-1',
    onBellClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<MessageNotificationBell {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a bell button', () => {
    render(<MessageNotificationBell {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });

  it('shows "0 unread messages" aria label initially', () => {
    render(<MessageNotificationBell {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toMatch(/0 unread messages/i);
  });

  it('calls onBellClick when bell button is clicked', () => {
    render(<MessageNotificationBell {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onBellClick).toHaveBeenCalled();
  });

  it('does not show badge when unread count is 0', () => {
    render(<MessageNotificationBell {...defaultProps} />);
    // Badge span should not be present when count is 0
    const badge = document.querySelector('.bg-red-500');
    expect(badge).toBeNull();
  });

  it('renders without onBellClick prop', () => {
    const { container } = render(
      <MessageNotificationBell userId="user-1" spaceId="space-1" />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('shows "No new messages" tooltip', () => {
    render(<MessageNotificationBell {...defaultProps} />);
    expect(screen.getByText('No new messages')).toBeTruthy();
  });
});
