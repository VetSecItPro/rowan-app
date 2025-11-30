'use client';

import { useState, useEffect } from 'react';
import { Calendar, MessageSquare, Camera, Mic, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { GoalCheckIn, GoalCheckInPhoto, goalsService } from '@/lib/services/goals-service';
import { CheckInReactions } from './CheckInReactions';

interface CheckInHistoryTimelineProps {
  goalId: string;
  isOpen: boolean;
  onClose: () => void;
}

const MOOD_CONFIG = {
  great: { emoji: '😊', color: 'text-green-600 bg-green-50 dark:bg-green-900/20', label: 'Great' },
  okay: { emoji: '😐', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', label: 'Okay' },
  struggling: { emoji: '😟', color: 'text-red-600 bg-red-50 dark:bg-red-900/20', label: 'Struggling' },
} as const;

export function CheckInHistoryTimeline({ goalId, isOpen, onClose }: CheckInHistoryTimelineProps) {
  const [checkIns, setCheckIns] = useState<GoalCheckIn[]>([]);
  const [checkInPhotos, setCheckInPhotos] = useState<Record<string, GoalCheckInPhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCheckIns, setExpandedCheckIns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && goalId) {
      loadCheckInHistory();
    }
  }, [isOpen, goalId]);

  const loadCheckInHistory = async () => {
    try {
      setLoading(true);
      const history = await goalsService.getGoalCheckIns(goalId);
      setCheckIns(history);

      // Load photos for each check-in
      const photosMap: Record<string, GoalCheckInPhoto[]> = {};
      for (const checkIn of history) {
        try {
          const photos = await goalsService.getCheckInPhotos(checkIn.id);
          if (photos.length > 0) {
            photosMap[checkIn.id] = photos;
          }
        } catch (error) {
          console.error(`Failed to load photos for check-in ${checkIn.id}:`, error);
        }
      }
      setCheckInPhotos(photosMap);
    } catch (error) {
      console.error('Failed to load check-in history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (checkInId: string) => {
    const newExpanded = new Set(expandedCheckIns);
    if (newExpanded.has(checkInId)) {
      newExpanded.delete(checkInId);
    } else {
      newExpanded.add(checkInId);
    }
    setExpandedCheckIns(newExpanded);
  };

  const getProgressTrend = (currentProgress: number, previousProgress?: number): 'up' | 'down' | 'same' => {
    if (previousProgress === undefined) return 'same';
    if (currentProgress > previousProgress) return 'up';
    if (currentProgress < previousProgress) return 'down';
    return 'same';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-4xl sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Check-In History</h2>
                <p className="text-sm text-indigo-100 mt-1">
                  {checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''} recorded
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-95"
              aria-label="Close timeline"
            >
              <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : checkIns.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Check-Ins Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Start checking in on your goal to see your progress timeline here.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 via-purple-300 to-pink-300"></div>

              <div className="space-y-8">
                {checkIns.map((checkIn, index) => {
                  const previousCheckIn = checkIns[index + 1];
                  const trend = getProgressTrend(checkIn.progress_percentage, previousCheckIn?.progress_percentage);
                  const moodConfig = MOOD_CONFIG[checkIn.mood];
                  const photos = checkInPhotos[checkIn.id] || [];
                  const isExpanded = expandedCheckIns.has(checkIn.id);
                  const hasContent = checkIn.notes || checkIn.blockers || checkIn.voice_note_url || photos.length > 0;

                  return (
                    <div key={checkIn.id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${moodConfig.color} border-4 border-white dark:border-gray-800 shadow-lg`}>
                        <span className="text-lg">{moodConfig.emoji}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {checkIn.progress_percentage}%
                                </span>
                                {trend === 'up' && (
                                  <TrendingUp className="w-4 h-4 text-green-500" />
                                )}
                                {trend === 'down' && (
                                  <TrendingDown className="w-4 h-4 text-red-500" />
                                )}
                                {trend === 'same' && (
                                  <Minus className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${moodConfig.color}`}>
                                {moodConfig.label}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {format(new Date(checkIn.created_at), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(new Date(checkIn.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${checkIn.progress_percentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Help Indicator */}
                          {checkIn.need_help_from_partner && (
                            <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              <span className="text-sm font-medium">Requested partner support</span>
                            </div>
                          )}

                          {/* Media Indicators */}
                          {hasContent && (
                            <div className="flex items-center gap-4 mb-3">
                              {checkIn.voice_note_url && (
                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                  <Mic className="w-4 h-4" />
                                  <span className="text-xs">
                                    {checkIn.voice_note_duration ? formatDuration(checkIn.voice_note_duration) : 'Voice note'}
                                  </span>
                                </div>
                              )}
                              {photos.length > 0 && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Camera className="w-4 h-4" />
                                  <span className="text-xs">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {(checkIn.notes || checkIn.blockers) && (
                                <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                  <MessageSquare className="w-4 h-4" />
                                  <span className="text-xs">Notes</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Reactions */}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <CheckInReactions checkInId={checkIn.id} />
                          </div>

                          {/* Expand/Collapse Button */}
                          {hasContent && (
                            <button
                              onClick={() => toggleExpanded(checkIn.id)}
                              className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors mt-3"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  Show details
                                </>
                              )}
                            </button>
                          )}

                          {/* Expanded Content */}
                          {isExpanded && hasContent && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                              {/* Notes */}
                              {checkIn.notes && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Progress Notes
                                  </h4>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                    {checkIn.notes}
                                  </div>
                                </div>
                              )}

                              {/* Blockers */}
                              {checkIn.blockers && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Challenges & Blockers
                                  </h4>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                    {checkIn.blockers}
                                  </div>
                                </div>
                              )}

                              {/* Voice Note */}
                              {checkIn.voice_note_url && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Voice Note
                                  </h4>
                                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                    <audio controls className="w-full">
                                      <source src={checkIn.voice_note_url} type="audio/webm" />
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                </div>
                              )}

                              {/* Photos */}
                              {photos.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Progress Photos
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {photos.map((photo, photoIndex) => (
                                      <div key={photo.id} className="relative group">
                                        <img
                                          src={photo.photo_url}
                                          alt={photo.caption || `Progress photo ${photoIndex + 1}`}
                                          className="w-full h-24 object-cover rounded-lg"
                                        />
                                        {photo.caption && (
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xs text-center px-2">
                                              {photo.caption}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}