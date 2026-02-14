/**
 * useVoiceInput — Speech-to-text hook for Rowan AI chat
 *
 * Uses the Web Speech API (SpeechRecognition) for real-time voice transcription.
 * Falls back gracefully when speech recognition is unavailable.
 *
 * States: idle → listening → (processing) → idle
 *
 * @example
 * const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceInput({
 *   onResult: (text) => sendMessage(text),
 *   language: 'en-US',
 * });
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API types (not included in default TS lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export type VoiceInputState = 'idle' | 'listening' | 'error';

export interface UseVoiceInputOptions {
  /** Called when final speech result is available */
  onResult?: (transcript: string) => void;
  /** Language for recognition (default: en-US) */
  language?: string;
  /** Auto-stop after this many ms of silence (default: 10000) */
  silenceTimeout?: number;
}

export interface UseVoiceInputReturn {
  /** Whether speech recognition is supported in this browser */
  isSupported: boolean;
  /** Current state of voice input */
  state: VoiceInputState;
  /** Whether actively listening */
  isListening: boolean;
  /** Interim transcript (updates as user speaks) */
  transcript: string;
  /** Error message if recognition failed */
  error: string | null;
  /** Start listening for speech */
  startListening: () => void;
  /** Stop listening and finalize */
  stopListening: () => void;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Provides speech-to-text voice input using the Web Speech API with start/stop controls */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    onResult,
    language = 'en-US',
    silenceTimeout = 10000,
  } = options;

  const [state, setState] = useState<VoiceInputState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);

  // Keep callback ref in sync
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const isSupported = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      setState('error');
      return;
    }

    // Clean up any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setError(null);
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setState('listening');

      // Auto-stop after silence timeout
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, silenceTimeout);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reset silence timer on any speech activity
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, silenceTimeout);

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim results while speaking
      setTranscript(finalTranscript || interimTranscript);

      // When we have a final result, send it
      if (finalTranscript) {
        onResultRef.current?.(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer();

      // "aborted" and "no-speech" are normal — not errors
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setState('idle');
        return;
      }

      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please enable it in your browser settings.',
        'network': 'Network error during speech recognition.',
        'audio-capture': 'No microphone found. Please connect one and try again.',
        'service-not-allowed': 'Speech recognition service is not allowed.',
      };

      setError(errorMessages[event.error] || `Speech recognition error: ${event.error}`);
      setState('error');
    };

    recognition.onend = () => {
      clearSilenceTimer();
      recognitionRef.current = null;

      // Only reset to idle if not already in error state
      setState((prev) => (prev === 'error' ? prev : 'idle'));
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError('Failed to start speech recognition. It may already be in use.');
      setState('error');
    }
  }, [language, silenceTimeout, stopListening, clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [clearSilenceTimer]);

  return {
    isSupported,
    state,
    isListening: state === 'listening',
    transcript,
    error,
    startListening,
    stopListening,
  };
}
