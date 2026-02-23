// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/hooks/useVoiceInput', () => ({
  useVoiceInput: vi.fn(() => ({
    isSupported: false,
    isListening: false,
    transcript: '',
    error: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
  })),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ChatInput from '@/components/chat/ChatInput';

describe('ChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onStop: vi.fn(),
    isLoading: false,
    isStreaming: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the textarea with default placeholder', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask Rowan anything...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<ChatInput {...defaultProps} placeholder="Type here..." />);
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
  });

  it('renders the send button when not streaming', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
  });

  it('renders the stop button when streaming', () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />);
    expect(screen.getByLabelText('Stop generating')).toBeInTheDocument();
  });

  it('does not render send button when streaming', () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />);
    expect(screen.queryByLabelText('Send message')).not.toBeInTheDocument();
  });

  it('calls onSend when Enter is pressed with text', () => {
    // Component uses uncontrolled ref pattern; simulate via Enter keyDown
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    // Set value directly on the DOM node so ref.current.value is non-empty
    Object.defineProperty(textarea, 'value', {
      writable: true,
      value: 'Hello there',
    });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledWith('Hello there');
  });

  it('calls onStop when stop button is clicked', () => {
    const onStop = vi.fn();
    render(<ChatInput {...defaultProps} isStreaming={true} onStop={onStop} />);

    fireEvent.click(screen.getByLabelText('Stop generating'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('disables textarea when disabled prop is true', () => {
    render(<ChatInput {...defaultProps} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('disables textarea when isLoading is true', () => {
    render(<ChatInput {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('sends message on Enter key press', () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    Object.defineProperty(textarea, 'value', { writable: true, value: 'Test message' });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    Object.defineProperty(textarea, 'value', { writable: true, value: 'Test message' });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend with empty message', () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).not.toHaveBeenCalled();
  });
});
