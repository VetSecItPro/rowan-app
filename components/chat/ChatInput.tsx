/**
 * ChatInput — Message input bar with send, voice, and stop buttons
 *
 * Features:
 * - Auto-expanding textarea
 * - Enter to send (Shift+Enter for newline)
 * - Voice input button (speech-to-text)
 * - Stop button while streaming
 * - Disabled while streaming or pending confirmation
 */

'use client';

import { useRef, useCallback, type KeyboardEvent, type FormEvent } from 'react';
import { Send, Square } from 'lucide-react';
import VoiceInputButton from './VoiceInputButton';

interface ChatInputProps {
  onSend: (message: string, voiceDurationSeconds?: number) => void;
  onStop?: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  voiceEnabled?: boolean;
}

export default function ChatInput({
  onSend,
  onStop,
  isLoading,
  isStreaming,
  disabled,
  placeholder = 'Ask Rowan anything...',
  voiceEnabled = true,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const value = textareaRef.current?.value.trim();
      if (!value || isLoading) return;

      onSend(value);

      if (textareaRef.current) {
        textareaRef.current.value = '';
        textareaRef.current.style.height = 'auto';
      }
    },
    [onSend, isLoading]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  const handleVoiceTranscript = useCallback(
    (text: string, durationSeconds?: number) => {
      if (text.trim()) {
        onSend(text.trim(), durationSeconds);
      }
    },
    [onSend]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-3 border-t border-gray-700/50 bg-gray-800/50"
    >
      <textarea
        ref={textareaRef}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className="flex-1 resize-none rounded-xl bg-gray-900 border border-gray-700/50 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Voice input — hidden when streaming */}
      {!isStreaming && (
        <VoiceInputButton
          onTranscript={handleVoiceTranscript}
          disabled={disabled || isLoading}
          voiceEnabled={voiceEnabled}
        />
      )}

      {isStreaming && onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors"
          aria-label="Stop generating"
        >
          <Square className="w-4 h-4 text-white" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={disabled || isLoading}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label="Send message"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      )}
    </form>
  );
}
