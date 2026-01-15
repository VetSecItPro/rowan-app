'use client';

import { useState, useRef } from 'react';
import { X, Camera, Plus, Trash2, Target } from 'lucide-react';
import { CreateCheckInInput } from '@/lib/services/goals-service';
import { AdvancedVoiceRecorder } from './AdvancedVoiceRecorder';
import { voiceTranscriptionService } from '@/lib/services/voice-transcription-service';
import { PremiumButton, SecondaryButton } from '@/components/ui/EnhancedButton';
import { logger } from '@/lib/logger';

// Mood emoji options
const MOOD_OPTIONS = [
  { value: 'great', emoji: '😊', label: 'Great', color: 'text-green-600' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: 'text-yellow-600' },
  { value: 'struggling', emoji: '😟', label: 'Struggling', color: 'text-red-600' },
] as const;

interface GoalCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (checkInData: CreateCheckInInput) => void;
  goalTitle: string;
  goalId: string;
  currentProgress?: number;
}

export function GoalCheckInModal({
  isOpen,
  onClose,
  onSave,
  goalTitle,
  goalId,
  currentProgress = 0
}: GoalCheckInModalProps) {
  const [formData, setFormData] = useState<CreateCheckInInput>({
    goal_id: goalId,
    progress_percentage: currentProgress,
    mood: 'okay',
    notes: '',
    blockers: '',
    need_help_from_partner: false,
    photos: [],
  });

  const [voiceNoteBlob, setVoiceNoteBlob] = useState<Blob | null>(null);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState(0);
  const [voiceNoteMetadata, setVoiceNoteMetadata] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVoiceNoteSent = async (audioBlob: Blob, duration: number, metadata?: any) => {
    setVoiceNoteBlob(audioBlob);
    setVoiceNoteDuration(duration);
    setVoiceNoteMetadata(metadata);
    setShowVoiceRecorder(false);

    // Automatically transcribe if metadata is available
    if (metadata && audioBlob) {
      try {
        const transcriptionResult = await voiceTranscriptionService.transcribeAudio(audioBlob);
        setVoiceNoteMetadata((prev: any) => ({
          ...prev,
          transcription: transcriptionResult.transcription,
          confidence: transcriptionResult.confidence,
          keywords: transcriptionResult.keywords
        }));
      } catch (error) {
        logger.error('Failed to transcribe voice note:', error, { component: 'GoalCheckInModal', action: 'component_action' });
      }
    }
  };

  const handleVoiceNoteCancel = () => {
    setShowVoiceRecorder(false);
  };

  const removeVoiceNote = () => {
    setVoiceNoteBlob(null);
    setVoiceNoteDuration(0);
    setVoiceNoteMetadata(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    setFormData(prev => ({
      ...prev,
      photos: [...(prev.photos || []), ...imageFiles]
    }));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Include voice note metadata in the check-in data
      const checkInData = {
        ...formData,
        voice_note_duration: voiceNoteBlob ? voiceNoteDuration : undefined,
        voice_note_category: voiceNoteMetadata?.category || 'general',
        voice_note_template_id: voiceNoteMetadata?.template || null,
        voice_note_metadata: voiceNoteMetadata ? {
          transcription: voiceNoteMetadata.transcription,
          confidence: voiceNoteMetadata.confidence,
          keywords: voiceNoteMetadata.keywords,
          category: voiceNoteMetadata.category,
          tags: voiceNoteMetadata.tags || []
        } : {},
      };

      await onSave(checkInData);
      onClose();
    } catch (error) {
      logger.error('Error saving check-in:', error, { component: 'GoalCheckInModal', action: 'component_action' });
      alert('Failed to save check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-800 sm:rounded-2xl sm:max-w-2xl sm:max-h-[90vh] overflow-hidden overscroll-contain shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 sm:px-6 py-3 sm:py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Goal Check-In</h2>
              <p className="text-sm text-indigo-100 mt-1 truncate">{goalTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 flex items-center justify-center hover:bg-white/20 rounded-full transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-6">
          {/* Progress Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              How's your progress? ({formData.progress_percentage}%)
            </label>
            <div className="space-y-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.progress_percentage}
                onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) })}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${formData.progress_percentage}%, #e5e7eb ${formData.progress_percentage}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Mood Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              How are you feeling about this goal?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, mood: mood.value })}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    formData.mood === mood.value
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-2">{mood.emoji}</div>
                  <div className={`text-sm font-medium ${mood.color}`}>{mood.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Progress Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Share what you've accomplished, what's working well, or any insights..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
            />
          </div>

          {/* Blockers */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Any challenges or blockers?
            </label>
            <textarea
              value={formData.blockers}
              onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
              placeholder="What's standing in your way? What obstacles have you encountered?"
              rows={2}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
            />
          </div>

          {/* Need Help Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl">
            <div>
              <div className="text-sm font-medium text-gray-300">
                Need help from your partner?
              </div>
              <div className="text-xs text-gray-400 mt-1">
                They'll be notified and can offer support
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, need_help_from_partner: !formData.need_help_from_partner })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.need_help_from_partner
                  ? 'bg-blue-600'
                  : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  formData.need_help_from_partner ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Voice Note Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Voice Note (Optional)
            </label>

            {!showVoiceRecorder && !voiceNoteBlob && (
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-400 transition-all flex items-center justify-center gap-3 text-gray-400"
              >
                <Plus className="w-5 h-5" />
                <span>Add Voice Check-In</span>
              </button>
            )}

            {showVoiceRecorder && (
              <AdvancedVoiceRecorder
                onSendVoice={handleVoiceNoteSent}
                onCancel={handleVoiceNoteCancel}
                goalTitle={goalTitle}
              />
            )}

            {voiceNoteBlob && !showVoiceRecorder && (
              <div className="p-4 bg-gradient-to-r from-blue-50 from-blue-900/20 to-indigo-900/20 rounded-xl border border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        Advanced Voice Check-In
                        {voiceNoteMetadata?.category && voiceNoteMetadata.category !== 'general' && (
                          <span className="px-2 py-1 text-xs bg-blue-900/30 text-blue-400 rounded-md capitalize">
                            {voiceNoteMetadata.category}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        Duration: {formatDuration(voiceNoteDuration)}
                        {voiceNoteMetadata?.transcription && (
                          <>
                            <span>•</span>
                            <span>Transcribed</span>
                          </>
                        )}
                        {voiceNoteMetadata?.template && (
                          <>
                            <span>•</span>
                            <span>Template used</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeVoiceNote}
                    className="btn-touch p-2 text-red-600 hover:bg-red-900/30 rounded-lg transition-colors active-press"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {voiceNoteMetadata?.transcription && (
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-blue-700">
                    <div className="text-xs font-medium text-blue-400 mb-1">
                      Transcription ({Math.round((voiceNoteMetadata.confidence || 0) * 100)}% confidence):
                    </div>
                    <p className="text-sm text-gray-300">
                      {voiceNoteMetadata.transcription}
                    </p>
                    {voiceNoteMetadata.keywords && voiceNoteMetadata.keywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {voiceNoteMetadata.keywords.slice(0, 5).map((keyword: string, index: number) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Photo Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Progress Photos (Optional)
            </label>

            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-400 transition-all flex items-center justify-center gap-3 text-gray-400"
              >
                <Camera className="w-5 h-5" />
                <span>Add Progress Photos</span>
              </button>

              {formData.photos && formData.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Progress photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <SecondaryButton
              type="button"
              onClick={onClose}
              feature="goals"
              className="flex-1"
            >
              Cancel
            </SecondaryButton>
            <PremiumButton
              type="submit"
              disabled={isSubmitting}
              feature="goals"
              className="flex-1"
              loading={isSubmitting}
              icon={<Target className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving...' : 'Save Check-In'}
            </PremiumButton>
          </div>
        </form>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}