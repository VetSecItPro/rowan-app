'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Calendar, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { smartSchedulingService, TimeSlot, DURATION_PRESETS } from '@/lib/services/smart-scheduling-service';

interface FindTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  participants: string[];
  onSelectTimeSlot: (slot: TimeSlot) => void;
}

export function FindTimeModal({ isOpen, onClose, spaceId, participants, onSelectTimeSlot }: FindTimeModalProps) {
  const [duration, setDuration] = useState(60); // Default 1 hour
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: addDays(new Date(), 7) // Default next 7 days
  });
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    if (isOpen) {
      findAvailableSlots();
    }
  }, [isOpen, duration, dateRange]);

  const findAvailableSlots = async () => {
    setLoading(true);
    try {
      const slots = await smartSchedulingService.findOptimalTimeSlots({
        duration,
        dateRange,
        participants,
        spaceId,
        bufferBefore: 5,
        bufferAfter: 5
      });
      setTimeSlots(slots);
    } catch (error) {
      console.error('Failed to find time slots:', error);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleConfirm = () => {
    if (selectedSlot) {
      onSelectTimeSlot(selectedSlot);
      onClose();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Fair';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-3xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-calendar text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Find Optimal Time</h2>
              <p className="text-purple-100 text-xs sm:text-sm mt-1">AI-powered scheduling assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-95"
            title="Close (Esc)"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Clock className="w-4 h-4 inline mr-2" />
              Event Duration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setDuration(preset.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-center group relative ${
                    duration === preset.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  title={preset.label}
                >
                  <div className="text-2xl mb-1">{preset.icon}</div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white">{preset.label}</div>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Calendar className="w-4 h-4 inline mr-2" />
              Search Time Range
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setDateRange({ start: new Date(), end: addDays(new Date(), 3) })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  dateRange.end.getTime() === addDays(new Date(), 3).getTime()
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">Next 3 Days</div>
              </button>
              <button
                onClick={() => setDateRange({ start: new Date(), end: addDays(new Date(), 7) })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  dateRange.end.getTime() === addDays(new Date(), 7).getTime()
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">Next Week</div>
              </button>
              <button
                onClick={() => setDateRange({ start: new Date(), end: addDays(new Date(), 14) })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  dateRange.end.getTime() === addDays(new Date(), 14).getTime()
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">Next 2 Weeks</div>
              </button>
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Participants: {participants.length}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Finding times that work for all space members
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Finding optimal time slots...</p>
            </div>
          )}

          {/* Time Slots */}
          {!loading && timeSlots.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Suggested Time Slots ({timeSlots.length})
              </h3>
              <div className="space-y-3">
                {timeSlots.map((slot, index) => {
                  const startTime = parseISO(slot.start_time);
                  const endTime = parseISO(slot.end_time);
                  const isSelected = selectedSlot === slot;

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectSlot(slot)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {slot.label}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')} ({duration} min)
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getScoreColor(slot.score)}`}>
                            {getScoreLabel(slot.score)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Score: {slot.score}/100
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && timeSlots.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No available time slots found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                Try adjusting the duration or date range
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedSlot}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedSlot
                ? 'bg-gradient-calendar text-white hover:opacity-90 shadow-lg'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            Create Event with Selected Time
          </button>
        </div>
      </div>
    </div>
  );
}
