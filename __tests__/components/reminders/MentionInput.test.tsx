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

import { MentionInput } from '@/components/reminders/MentionInput';

const defaultProps = {
  value: '',
  onChange: vi.fn(),
  spaceId: 'space-1',
};

describe('MentionInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<MentionInput {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders a textarea element', () => {
    render(<MentionInput {...defaultProps} />);
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeTruthy();
  });

  it('renders with default placeholder', () => {
    render(<MentionInput {...defaultProps} />);
    const textarea = document.querySelector('textarea');
    expect(textarea?.placeholder).toBe('Type @ to mention someone...');
  });

  it('renders with custom placeholder', () => {
    render(<MentionInput {...defaultProps} placeholder="Write a comment..." />);
    const textarea = document.querySelector('textarea');
    expect(textarea?.placeholder).toBe('Write a comment...');
  });

  it('renders with custom rows', () => {
    render(<MentionInput {...defaultProps} rows={5} />);
    const textarea = document.querySelector('textarea');
    expect(textarea?.rows).toBe(5);
  });

  it('renders with maxLength', () => {
    render(<MentionInput {...defaultProps} maxLength={100} />);
    const textarea = document.querySelector('textarea');
    expect(textarea?.maxLength).toBe(100);
  });

  it('calls onChange when text is entered', () => {
    const onChange = vi.fn();
    render(<MentionInput {...defaultProps} onChange={onChange} />);
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello', selectionStart: 5 } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<MentionInput {...defaultProps} disabled={true} />);
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it('renders with className prop', () => {
    render(<MentionInput {...defaultProps} className="custom-class" />);
    const textarea = document.querySelector('textarea');
    expect(textarea?.className).toBe('custom-class');
  });

  it('does not show mention dropdown initially', () => {
    render(<MentionInput {...defaultProps} />);
    // Dropdown is only shown when showMentionDropdown && filteredMembers.length > 0
    const dropdown = document.querySelector('.absolute.z-50');
    expect(dropdown).toBeNull();
  });
});
