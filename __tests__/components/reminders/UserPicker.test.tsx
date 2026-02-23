// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  })),
}));

import { UserPicker } from '@/components/reminders/UserPicker';

const defaultProps = {
  spaceId: 'space-1',
  selectedUserId: null,
  onSelect: vi.fn(),
};

describe('UserPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<UserPicker {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the default label "Assigned to"', () => {
    render(<UserPicker {...defaultProps} />);
    expect(screen.getByText('Assigned to')).toBeTruthy();
  });

  it('renders with custom label', () => {
    render(<UserPicker {...defaultProps} label="Assign reminder to" />);
    expect(screen.getByText('Assign reminder to')).toBeTruthy();
  });

  it('shows Unassigned when no user is selected', () => {
    render(<UserPicker {...defaultProps} />);
    expect(screen.getByText('Unassigned')).toBeTruthy();
  });

  it('renders the dropdown trigger button', () => {
    render(<UserPicker {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('opens dropdown when trigger button is clicked', () => {
    render(<UserPicker {...defaultProps} />);
    const triggerBtn = screen.getAllByRole('button')[0];
    fireEvent.click(triggerBtn);
    expect(screen.getByPlaceholderText('Search members...')).toBeTruthy();
  });

  it('shows Loading members when dropdown is open', () => {
    render(<UserPicker {...defaultProps} />);
    const triggerBtn = screen.getAllByRole('button')[0];
    fireEvent.click(triggerBtn);
    expect(screen.getByText('Loading members...')).toBeTruthy();
  });

  it('renders with className prop', () => {
    const { container } = render(
      <UserPicker {...defaultProps} className="custom-class" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('closes dropdown when backdrop is clicked', () => {
    render(<UserPicker {...defaultProps} />);
    const triggerBtn = screen.getAllByRole('button')[0];
    fireEvent.click(triggerBtn);
    // Backdrop is a fixed-position div
    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    if (backdrop) fireEvent.click(backdrop);
    expect(screen.queryByPlaceholderText('Search members...')).toBeNull();
  });
});
