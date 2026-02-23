// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MentionInput } from '@/components/messages/MentionInput';

vi.mock('@/lib/services/mentions-service', () => ({
  mentionsService: {
    getMentionableUsers: vi.fn().mockResolvedValue([
      { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      { id: 'user-2', name: 'Bob', email: 'bob@example.com' },
    ]),
    extractMentions: vi.fn(() => []),
  },
}));

vi.mock('@/components/messages/RichTextToolbar', () => ({
  RichTextToolbar: ({ onFormatApplied }: { textareaRef: unknown; onFormatApplied?: () => void }) =>
    React.createElement('div', { 'data-testid': 'rich-text-toolbar' }, 'Toolbar'),
}));

describe('MentionInput', () => {
  const onChange = vi.fn();
  const onSubmit = vi.fn();

  const defaultProps = {
    value: '',
    onChange,
    onSubmit,
    spaceId: 'space-1',
    placeholder: 'Type a message...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<MentionInput {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders textarea', () => {
    render(<MentionInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeTruthy();
  });

  it('shows placeholder text', () => {
    render(<MentionInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Type a message...');
    expect(textarea).toBeTruthy();
  });

  it('calls onChange when text is typed', () => {
    render(<MentionInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('displays the current value', () => {
    render(<MentionInput {...defaultProps} value="Current message" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Current message');
  });

  it('is disabled when disabled prop is true', () => {
    render(<MentionInput {...defaultProps} disabled={true} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it('renders rich text toolbar by default', () => {
    render(<MentionInput {...defaultProps} showToolbar={true} />);
    expect(screen.getByTestId('rich-text-toolbar')).toBeTruthy();
  });

  it('hides rich text toolbar when showToolbar is false', () => {
    render(<MentionInput {...defaultProps} showToolbar={false} />);
    expect(screen.queryByTestId('rich-text-toolbar')).toBeNull();
  });

  it('calls onSubmit when Enter key is pressed', () => {
    render(<MentionInput {...defaultProps} value="Hello" />);
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('does not submit on Shift+Enter (newline)', () => {
    render(<MentionInput {...defaultProps} value="Hello" />);
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
