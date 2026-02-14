'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Loader2,
  Volume2,
  SkipBack,
  SkipForward,
  MessageSquare,
  FileText,
  Zap,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

// WaveSurfer will be imported dynamically in the component
type WaveSurferType = typeof import('wavesurfer.js').default;
type WaveSurferInstance = ReturnType<WaveSurferType['create']>;

interface AdvancedVoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number, metadata?: VoiceNoteMetadata) => Promise<void>;
  onCancel?: () => void;
  goalTitle?: string;
  templates?: VoiceNoteTemplate[];
}

interface VoiceNoteMetadata {
  category: 'progress' | 'challenges' | 'reflections' | 'goals' | 'general';
  transcription?: string;
  tags?: string[];
  template?: string;
}

interface VoiceNoteTemplate {
  id: string;
  name: string;
  category: VoiceNoteMetadata['category'];
  prompt: string;
  questions: string[];
}

const DEFAULT_TEMPLATES: VoiceNoteTemplate[] = [
  {
    id: 'progress-update',
    name: 'Progress Update',
    category: 'progress',
    prompt: 'Share what progress you\'ve made since your last check-in',
    questions: [
      'What specific actions did you take?',
      'What results did you achieve?',
      'How do you feel about your progress?'
    ]
  },
  {
    id: 'challenges-reflection',
    name: 'Challenges & Blockers',
    category: 'challenges',
    prompt: 'Reflect on any challenges or obstacles you\'ve encountered',
    questions: [
      'What challenges are you facing?',
      'What\'s preventing you from moving forward?',
      'What support or resources do you need?'
    ]
  },
  {
    id: 'personal-reflection',
    name: 'Personal Reflection',
    category: 'reflections',
    prompt: 'Take a moment to reflect on your goal journey',
    questions: [
      'How has this goal impacted you personally?',
      'What have you learned about yourself?',
      'What would you do differently?'
    ]
  },
  {
    id: 'next-steps',
    name: 'Next Steps Planning',
    category: 'goals',
    prompt: 'Plan your next steps and set intentions',
    questions: [
      'What will you focus on next?',
      'What are your priorities for the coming period?',
      'How will you measure success?'
    ]
  }
];

/** Renders a voice recorder with waveform visualization for goal check-in notes. */
export function AdvancedVoiceRecorder({
  onSendVoice,
  onCancel,
  goalTitle,
  templates = DEFAULT_TEMPLATES
}: AdvancedVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<VoiceNoteTemplate | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [metadata, setMetadata] = useState<VoiceNoteMetadata>({ category: 'general' });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

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

  const initializeWaveSurfer = useCallback(async () => {
    if (!waveformRef.current || !audioUrl) return;

    try {
      const WaveSurferModule = await import('wavesurfer.js');
      const WaveSurferClass = WaveSurferModule.default;

      wavesurferRef.current = WaveSurferClass.create({
        container: waveformRef.current,
        waveColor: '#6366f1',
        progressColor: '#4338ca',
        cursorColor: '#1e40af',
        barWidth: 2,
        barRadius: 3,
        height: 60,
        normalize: true,
        backend: 'WebAudio',
        mediaControls: false,
      });

      await wavesurferRef.current.load(audioUrl);

      wavesurferRef.current.on('finish', () => {
        setIsPlaying(false);
      });

      wavesurferRef.current.on('play', () => {
        setIsPlaying(true);
      });

      wavesurferRef.current.on('pause', () => {
        setIsPlaying(false);
      });

    } catch (error) {
      logger.error('Failed to initialize WaveSurfer:', error, { component: 'AdvancedVoiceRecorder', action: 'component_action' });
      // Fallback to basic audio element
    }
  }, [audioUrl]);

  // Initialize WaveSurfer when audio is ready
  useEffect(() => {
    if (audioUrl && waveformRef.current && !wavesurferRef.current) {
      initializeWaveSurfer();
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, initializeWaveSurfer]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);

        setAudioUrl(url);
        setAudioBlob(audioBlob);
        setIsRecording(false);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setPermissionDenied(false);

      // Move to next question if using template
      if (selectedTemplate && currentQuestionIndex < selectedTemplate.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }

    } catch (error) {
      logger.error('Error accessing microphone:', error, { component: 'AdvancedVoiceRecorder', action: 'component_action' });
      setPermissionDenied(true);
      toast.error('Microphone permission denied');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    } else if (audioRef.current) {
      // Fallback to basic audio controls
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (direction: 'forward' | 'backward') => {
    if (wavesurferRef.current) {
      const currentTime = wavesurferRef.current.getCurrentTime();
      const duration = wavesurferRef.current.getDuration();
      const seekAmount = 10; // 10 seconds

      if (direction === 'forward') {
        wavesurferRef.current.seekTo(Math.min(1, (currentTime + seekAmount) / duration));
      } else {
        wavesurferRef.current.seekTo(Math.max(0, (currentTime - seekAmount) / duration));
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(speed);
    } else if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(newVolume);
    } else if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    try {
      // Note: This would need to integrate with a transcription service
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockTranscription = "This is a mock transcription of the voice note. In a real implementation, this would be generated by a speech-to-text service.";
      setMetadata(prev => ({ ...prev, transcription: mockTranscription }));
      toast.success('Transcription completed!');
    } catch (error) {
      logger.error('Transcription failed:', error, { component: 'AdvancedVoiceRecorder', action: 'component_action' });
      toast.error('Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTemplateSelect = (template: VoiceNoteTemplate) => {
    setSelectedTemplate(template);
    setCurrentQuestionIndex(0);
    setMetadata(prev => ({ ...prev, category: template.category, template: template.id }));
    setShowTemplates(false);
  };

  const handleDelete = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingDuration(0);
    setSelectedTemplate(null);
    setCurrentQuestionIndex(0);
    setMetadata({ category: 'general' });

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

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
      await onSendVoice(audioBlob, recordingDuration, metadata);
      handleDelete();
    } catch (error) {
      logger.error('Failed to send voice message:', error, { component: 'AdvancedVoiceRecorder', action: 'component_action' });
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

  const getCategoryIcon = (category: VoiceNoteMetadata['category']) => {
    switch (category) {
      case 'progress': return <Target className="w-4 h-4" />;
      case 'challenges': return <Zap className="w-4 h-4" />;
      case 'reflections': return <MessageSquare className="w-4 h-4" />;
      case 'goals': return <Target className="w-4 h-4" />;
      default: return <Mic className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: VoiceNoteMetadata['category']) => {
    switch (category) {
      case 'progress': return 'text-green-600 bg-green-900/20';
      case 'challenges': return 'text-red-600 bg-red-900/20';
      case 'reflections': return 'text-purple-600 bg-purple-900/20';
      case 'goals': return 'text-blue-600 bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-900/20';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      {/* Header with Goal Context */}
      {goalTitle && (
        <div className="text-center pb-2 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Voice Check-In
          </h3>
          <p className="text-sm text-gray-400">
            for &quot;{goalTitle}&quot;
          </p>
        </div>
      )}

      {/* Templates Section */}
      {!selectedTemplate && !isRecording && !audioUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">
              Choose a template (optional)
            </h4>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-sm text-indigo-400"
            >
              {showTemplates ? 'Hide' : 'Show'} templates
            </button>
          </div>

          {showTemplates && (
            <div className="grid grid-cols-1 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="text-left p-3 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(template.category)}`}>
                      {getCategoryIcon(template.category)}
                      {template.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {template.prompt}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Current Template Context */}
      {selectedTemplate && (
        <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(selectedTemplate.category)}`}>
              {getCategoryIcon(selectedTemplate.category)}
              {selectedTemplate.name}
            </span>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            {selectedTemplate.prompt}
          </p>
          {selectedTemplate.questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">
                Question {currentQuestionIndex + 1} of {selectedTemplate.questions.length}:
              </p>
              <p className="text-sm font-medium text-indigo-300">
                {selectedTemplate.questions[currentQuestionIndex]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recording State */}
      {!audioUrl && !isRecording && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleStartRecording}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 flex items-center justify-center transition-all active:scale-95 shadow-lg"
            aria-label="Start recording"
          >
            <Mic className="w-8 h-8 text-white" />
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-400">
              {selectedTemplate ? 'Answer the question above' : 'Tap to start recording'}
            </p>
            {selectedTemplate && (
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-xs text-gray-400 hover:text-gray-200 mt-1"
              >
                Cancel template
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Recording */}
      {isRecording && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xl font-mono text-white">
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

          {/* Live recording visualization placeholder */}
          <div className="h-12 bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 30 + 10}px`,
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Playback & Enhanced Controls */}
      {audioUrl && !isRecording && (
        <div className="space-y-4">
          {/* Waveform */}
          <div ref={waveformRef} className="w-full h-16 bg-gray-900 rounded-lg" />

          {/* Main Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSeek('backward')}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all active:scale-95"
                aria-label="Skip backward 10 seconds"
              >
                <SkipBack className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={handlePlayPause}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 flex items-center justify-center transition-all active:scale-95 shadow-lg"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={() => handleSeek('forward')}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all active:scale-95"
                aria-label="Skip forward 10 seconds"
              >
                <SkipForward className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{formatDuration(recordingDuration)}</span>
              {metadata.category !== 'general' && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(metadata.category)}`}>
                  {getCategoryIcon(metadata.category)}
                  {metadata.category}
                </span>
              )}
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-4">
              {/* Speed Control */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-16"
                />
              </div>
            </div>

            {/* Transcription */}
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-900/20 text-blue-400 rounded-md hover:bg-blue-900/40 transition-colors disabled:opacity-50"
            >
              {isTranscribing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
              {isTranscribing ? 'Transcribing...' : 'Transcribe'}
            </button>
          </div>

          {/* Transcription Result */}
          {metadata.transcription && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <h5 className="text-sm font-medium text-blue-100 mb-2">Transcription:</h5>
              <p className="text-sm text-blue-200">{metadata.transcription}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleDelete}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all active:scale-95 disabled:opacity-50"
              aria-label="Delete recording"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-300 disabled:from-blue-800 disabled:to-blue-900 text-white rounded-lg transition-all active:scale-95 shadow-lg"
              aria-label="Send voice message"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Sending...' : 'Send Check-In'}
            </button>
          </div>
        </div>
      )}

      {/* Permission Error */}
      {permissionDenied && (
        <div className="text-center py-4">
          <p className="text-sm text-red-400">
            Microphone permission denied. Please enable it in your browser settings to record voice notes.
          </p>
        </div>
      )}

      {/* Fallback audio element for basic playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
}
