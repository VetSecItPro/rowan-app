// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
const mockUseVoiceInput = vi.fn(() => ({
  isSupported: true,
  isListening: false,
  transcript: '',
  error: null,
  startListening: mockStartListening,
  stopListening: mockStopListening,
}));

vi.mock('@/lib/hooks/useVoiceInput', () => ({
  useVoiceInput: (...args: unknown[]) => mockUseVoiceInput(...args),
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

import VoiceInputButton from '@/components/chat/VoiceInputButton';

describe('VoiceInputButton', () => {
  const onTranscript = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVoiceInput.mockReturnValue({
      isSupported: true,
      isListening: false,
      transcript: '',
      error: null,
      startListening: mockStartListening,
      stopListening: mockStopListening,
    });
  });

  it('renders when speech recognition is supported and voice is enabled', () => {
    render(<VoiceInputButton onTranscript={onTranscript} voiceEnabled={true} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('returns null when voiceEnabled is false', () => {
    const { container } = render(
      <VoiceInputButton onTranscript={onTranscript} voiceEnabled={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when speech recognition is not supported', () => {
    mockUseVoiceInput.mockReturnValueOnce({
      isSupported: false,
      isListening: false,
      transcript: '',
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
    });

    const { container } = render(<VoiceInputButton onTranscript={onTranscript} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows start voice input label when not listening', () => {
    render(<VoiceInputButton onTranscript={onTranscript} />);
    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument();
  });

  it('shows stop listening label when listening', () => {
    mockUseVoiceInput.mockReturnValueOnce({
      isSupported: true,
      isListening: true,
      transcript: '',
      error: null,
      startListening: mockStartListening,
      stopListening: mockStopListening,
    });

    render(<VoiceInputButton onTranscript={onTranscript} />);
    expect(screen.getByLabelText('Stop listening')).toBeInTheDocument();
  });

  it('calls startListening when button is clicked while not listening', () => {
    render(<VoiceInputButton onTranscript={onTranscript} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  it('calls stopListening when button is clicked while listening', () => {
    mockUseVoiceInput.mockReturnValueOnce({
      isSupported: true,
      isListening: true,
      transcript: '',
      error: null,
      startListening: mockStartListening,
      stopListening: mockStopListening,
    });

    render(<VoiceInputButton onTranscript={onTranscript} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockStopListening).toHaveBeenCalledTimes(1);
  });

  it('disables the button when disabled prop is true', () => {
    render(<VoiceInputButton onTranscript={onTranscript} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows transcript when listening and transcript available', () => {
    mockUseVoiceInput.mockReturnValueOnce({
      isSupported: true,
      isListening: true,
      transcript: 'I am speaking',
      error: null,
      startListening: mockStartListening,
      stopListening: mockStopListening,
    });

    render(<VoiceInputButton onTranscript={onTranscript} />);
    expect(screen.getByText('I am speaking')).toBeInTheDocument();
  });

  it('shows error message when error occurs', () => {
    mockUseVoiceInput.mockReturnValueOnce({
      isSupported: true,
      isListening: false,
      transcript: '',
      error: 'Microphone access denied',
      startListening: mockStartListening,
      stopListening: mockStopListening,
    });

    render(<VoiceInputButton onTranscript={onTranscript} />);
    expect(screen.getByText('Microphone access denied')).toBeInTheDocument();
  });
});
