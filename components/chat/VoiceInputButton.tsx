/**
 * VoiceInputButton — Microphone button for speech-to-text in chat
 *
 * States:
 * - Idle: Mic icon, tap to start
 * - Listening: Pulsing ring animation, tap to stop
 * - Error: Red icon with tooltip
 *
 * Shows interim transcript below button while listening.
 */

'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceInput } from '@/lib/hooks/useVoiceInput';

interface VoiceInputButtonProps {
  /** Called with final transcript text */
  onTranscript: (text: string) => void;
  /** Disable when chat is loading/streaming */
  disabled?: boolean;
}

export default function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  } = useVoiceInput({
    onResult: onTranscript,
    silenceTimeout: 8000,
  });

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Don't render if speech recognition isn't available
  if (!isSupported) return null;

  return (
    <div className="relative flex flex-col items-center">
      {/* Interim transcript preview */}
      <AnimatePresence>
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full mb-2 max-w-[200px] px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700/50 shadow-lg"
          >
            <p className="text-xs text-gray-300 truncate">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full mb-2 max-w-[220px] px-3 py-1.5 rounded-lg bg-red-900/80 border border-red-700/50 shadow-lg"
          >
            <p className="text-xs text-red-200">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          isListening
            ? 'bg-red-600 hover:bg-red-500'
            : error
              ? 'bg-red-900/50 hover:bg-red-800/50'
              : 'bg-gray-700 hover:bg-gray-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        title={error || (isListening ? 'Tap to stop' : 'Tap to speak')}
      >
        {/* Pulsing ring when listening */}
        <AnimatePresence>
          {isListening && (
            <motion.span
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-xl bg-red-500"
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        {isListening ? (
          <MicOff className="w-4 h-4 text-white relative z-10" />
        ) : (
          <Mic className="w-4 h-4 text-white relative z-10" />
        )}
      </button>
    </div>
  );
}
