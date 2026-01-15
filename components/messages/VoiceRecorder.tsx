'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel?: () => void;
  autoSendOnStop?: boolean; // If true, auto-send when recording stops (default: true)
}

export function VoiceRecorder({ onSendVoice, onCancel, autoSendOnStop = true }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const durationAtStopRef = useRef(0); // Store duration at stop time for auto-send

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else if (!audioBlob) {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, audioBlob]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        // Auto-send if enabled, otherwise show playback UI
        if (autoSendOnStop) {
          setIsRecording(false);
          setSending(true);
          try {
            await onSendVoice(blob, durationAtStopRef.current);
            // Clean up
            URL.revokeObjectURL(url);
            setRecordingDuration(0);
            if (onCancel) onCancel();
          } catch (error) {
            logger.error('Failed to send voice message:', error, { component: 'VoiceRecorder', action: 'component_action' });
            toast.error('Failed to send voice message');
            // On error, show playback UI so user can retry
            setAudioUrl(url);
            setAudioBlob(blob);
          } finally {
            setSending(false);
          }
        } else {
          // Legacy behavior: show playback UI
          setAudioUrl(url);
          setAudioBlob(blob);
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setPermissionDenied(false);
    } catch (error) {
      logger.error('Error accessing microphone:', error, { component: 'VoiceRecorder', action: 'component_action' });
      setPermissionDenied(true);
      toast.error('Microphone permission denied');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Capture duration before stopping (since timer will be cleared)
      durationAtStopRef.current = recordingDuration;
      mediaRecorderRef.current.stop();
    }
  };

  const handlePlayPause = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDelete = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingDuration(0);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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
      logger.error('Failed to send voice message:', error, { component: 'VoiceRecorder', action: 'component_action' });
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      {/* Sending State (Auto-send in progress) */}
      {sending && !audioUrl && !isRecording && (
        <div className="flex items-center justify-center gap-3 py-2">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-400">
            Sending voice message...
          </span>
        </div>
      )}

      {/* Recording State */}
      {!audioUrl && !isRecording && !sending && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleStartRecording}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95 shadow-lg"
            aria-label="Start recording"
          >
            <Mic className="w-8 h-8 text-white" />
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-400">
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
            <span className="text-lg font-mono text-white">
              {formatDuration(recordingDuration)}
            </span>
          </div>
          <button
            onClick={handleStopRecording}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all active:scale-95"
            aria-label="Stop recording"
          >
            <Square className="w-6 h-6 text-white" />
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
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-0 transition-all" />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {formatDuration(recordingDuration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={sending}
              className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
              aria-label="Delete recording"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 flex items-center justify-center transition-all active:scale-95 shadow-lg"
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
      {permissionDenied && (
        <div className="text-center py-4">
          <p className="text-base md:text-sm text-red-400">
            Microphone permission denied. Please enable it in your browser settings.
          </p>
        </div>
      )}
    </div>
  );
}
