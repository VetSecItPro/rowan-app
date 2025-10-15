'use client';

import { useState, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel?: () => void;
}

export function VoiceRecorder({ onSendVoice, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const audioRef = useState<HTMLAudioElement | null>(null)[0];

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl, blob) => {
      setAudioUrl(blobUrl);
      setAudioBlob(blob);
      setIsRecording(false);
    },
  });

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Audio player controls
  useEffect(() => {
    if (audioUrl && !audioRef) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      (audioRef as any) = audio;
    }
  }, [audioUrl, audioRef]);

  const handleStartRecording = () => {
    setIsRecording(true);
    startRecording();
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    stopRecording();
  };

  const handlePlayPause = () => {
    if (!audioRef) return;

    if (isPlaying) {
      (audioRef as any).pause();
      setIsPlaying(false);
    } else {
      (audioRef as any).play();
      setIsPlaying(true);
    }
  };

  const handleDelete = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingDuration(0);
    clearBlobUrl();
    if (audioRef) {
      (audioRef as any).pause();
      (audioRef as any).src = '';
    }
    if (onCancel) onCancel();
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    setSending(true);
    try {
      await onSendVoice(audioBlob, recordingDuration);
      handleDelete();
    } catch (error) {
      console.error('Failed to send voice message:', error);
      toast.error('Failed to send voice message');
    } finally {
      setSending(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      {/* Recording State */}
      {!audioUrl && !isRecording && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleStartRecording}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95 shadow-lg"
            aria-label="Start recording"
          >
            <Mic className="w-8 h-8 text-white" />
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tap to start recording
            </p>
          </div>
        </div>
      )}

      {/* Active Recording */}
      {isRecording && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
            <span className="text-lg font-mono text-gray-900 dark:text-white">
              {formatDuration(recordingDuration)}
            </span>
          </div>
          <button
            onClick={handleStopRecording}
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-all active:scale-95"
            aria-label="Stop recording"
          >
            <Square className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>
        </div>
      )}

      {/* Playback & Send */}
      {audioUrl && !isRecording && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all active:scale-95"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-0 transition-all" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDuration(recordingDuration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={sending}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
              aria-label="Delete recording"
            >
              <Trash2 className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 flex items-center justify-center transition-all active:scale-95 shadow-lg"
              aria-label="Send voice message"
            >
              {sending ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Send className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Permission Error */}
      {status === 'permission_denied' && (
        <div className="text-center py-4">
          <p className="text-base md:text-sm text-red-600 dark:text-red-400">
            Microphone permission denied. Please enable it in your browser settings.
          </p>
        </div>
      )}
    </div>
  );
}
