'use client';

import React, { memo } from 'react';
import nextDynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Tooltip } from '@/components/shared/Tooltip';
import { useCheckIn } from '@/lib/hooks/useCheckIn';
import { formatDate, formatTimestamp, getCurrentDateString } from '@/lib/utils/date-utils';
import { format } from 'date-fns';
import {
  Heart,
  Sparkles,
  Zap,
  Clock,
  Trophy,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import type { DailyCheckIn } from '@/lib/services/checkins-service';

// Lazy-load heavy sub-components
const WeeklyInsights = nextDynamic(
  () => import('@/components/checkins/WeeklyInsights').then(mod => ({ default: mod.WeeklyInsights })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-32" /> }
);

const ActivityFeed = nextDynamic(
  () => import('@/components/dashboard/ActivityFeed').then(mod => ({ default: mod.ActivityFeed })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-64" /> }
);

const CheckInSuccess = nextDynamic(
  () => import('@/components/checkins/CheckInSuccess').then(mod => ({ default: mod.CheckInSuccess })),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckInSectionProps {
  userId: string;
  spaceId: string;
}

// ─── Mood Styles ──────────────────────────────────────────────────────────────

const moodStyles = {
  great: {
    gradient: 'from-green-400 to-emerald-500',
    glow: 'shadow-green-500/30',
    ring: 'ring-green-400/50',
    bgActive: 'bg-gradient-to-br from-green-900/40 to-emerald-900/40',
    bgHover: 'bg-gradient-to-br from-green-900/20 to-emerald-900/20',
  },
  good: {
    gradient: 'from-blue-400 to-cyan-500',
    glow: 'shadow-blue-500/30',
    ring: 'ring-blue-400/50',
    bgActive: 'bg-gradient-to-br from-blue-900/40 to-cyan-900/40',
    bgHover: 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20',
  },
  okay: {
    gradient: 'from-gray-400 to-slate-500',
    glow: 'shadow-gray-500/30',
    ring: 'ring-gray-400/50',
    bgActive: 'bg-gradient-to-br from-gray-800/60 to-slate-800/60',
    bgHover: 'bg-gradient-to-br from-gray-800/40 to-slate-800/40',
  },
  meh: {
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-500/30',
    ring: 'ring-amber-400/50',
    bgActive: 'bg-gradient-to-br from-amber-900/40 to-orange-900/40',
    bgHover: 'bg-gradient-to-br from-amber-900/20 to-orange-900/20',
  },
  rough: {
    gradient: 'from-purple-400 to-pink-500',
    glow: 'shadow-purple-500/30',
    ring: 'ring-purple-400/50',
    bgActive: 'bg-gradient-to-br from-purple-900/40 to-pink-900/40',
    bgHover: 'bg-gradient-to-br from-purple-900/20 to-pink-900/20',
  },
} as const;

const moodColors: Record<string, string> = {
  great: 'bg-green-500',
  good: 'bg-blue-500',
  okay: 'bg-gray-400',
  meh: 'bg-amber-500',
  rough: 'bg-purple-500',
};

const moodHeights: Record<string, string> = {
  great: 'h-full',
  good: 'h-4/5',
  okay: 'h-3/5',
  meh: 'h-2/5',
  rough: 'h-1/5',
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

const EnergyBar = memo(function EnergyBar({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((l) => (
        <div
          key={l}
          className={`h-3 flex-1 rounded-sm transition-colors ${
            l <= level
              ? 'bg-gradient-to-r from-amber-500 to-orange-400'
              : 'bg-gray-700/50'
          }`}
        />
      ))}
    </div>
  );
});

const EnergySelector = memo(function EnergySelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const heights = ['h-4', 'h-5', 'h-6', 'h-7', 'h-8'];
  return (
    <div>
      <label className="text-sm font-medium text-gray-300 mb-2 block flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        Energy (Optional)
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-7 shrink-0">Low</span>
        <div className="flex items-end gap-1 flex-1">
          {[1, 2, 3, 4, 5].map((level) => {
            const isActive = value !== null && level <= value;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onChange(value === level ? null : level)}
                className={`flex-1 rounded-md transition-all duration-200 ${heights[level - 1]} ${
                  isActive
                    ? 'bg-gradient-to-t from-amber-600 to-orange-400 shadow-sm shadow-amber-500/30'
                    : 'bg-gray-700/60 hover:bg-gray-600/60'
                }`}
                aria-label={`Energy level ${level}`}
              />
            );
          })}
        </div>
        <span className="text-xs text-gray-400 w-8 shrink-0 text-right">High</span>
      </div>
    </div>
  );
});

// ─── Partner Moods Row ────────────────────────────────────────────────────────

const PartnerMoodsRow = memo(function PartnerMoodsRow({
  userId,
  recentCheckIns,
  moodOptions,
  checkInReactions,
  partnerReactionLoading,
  handleSendReaction,
}: {
  userId: string;
  recentCheckIns: DailyCheckIn[];
  moodOptions: Array<{ emoji: string; label: string; value: string }>;
  checkInReactions: Record<string, import('@/lib/services/reactions-service').CheckInReaction[]>;
  partnerReactionLoading: boolean;
  handleSendReaction: (checkinId: string, reactionType: 'heart' | 'hug' | 'strength') => Promise<void>;
}) {
  const today = getCurrentDateString();
  const userToday = recentCheckIns.find(c => c.user_id === userId && c.date === today);
  const partnerToday = recentCheckIns.find(c => c.user_id !== userId && c.date === today);
  const userEmoji = userToday ? moodOptions.find(m => m.value === userToday.mood)?.emoji : null;
  const partnerEmoji = partnerToday ? moodOptions.find(m => m.value === partnerToday.mood)?.emoji : null;

  if (!userEmoji && !partnerEmoji) return null;

  return (
    <div className="flex items-center gap-3 mb-4 px-2">
      {userEmoji && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 rounded-full border border-pink-700/50">
          <span className="text-xl">{userEmoji}</span>
          <span className="text-xs font-medium text-gray-300">You</span>
        </div>
      )}

      {partnerEmoji && partnerToday ? (
        <>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 rounded-full border border-purple-700/50">
            <span className="text-xl">{partnerEmoji}</span>
            <span className="text-xs font-medium text-gray-300">Partner</span>
          </div>

          <div className="flex items-center gap-1">
            {checkInReactions[partnerToday.id]?.length > 0 ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-pink-900/30 rounded-full border border-pink-700">
                <span className="text-sm">
                  {checkInReactions[partnerToday.id][0].reaction_type === 'heart' && '❤️'}
                  {checkInReactions[partnerToday.id][0].reaction_type === 'hug' && '🤗'}
                  {checkInReactions[partnerToday.id][0].reaction_type === 'strength' && '💪'}
                </span>
                <span className="text-xs text-pink-400 font-medium">Sent</span>
              </div>
            ) : (
              <>
                {(['heart', 'hug', 'strength'] as const).map((type) => {
                  const emojis = { heart: '❤️', hug: '🤗', strength: '💪' };
                  const colors = { heart: 'hover:bg-pink-900/30', hug: 'hover:bg-purple-900/30', strength: 'hover:bg-blue-900/30' };
                  const titles = { heart: 'Send love', hug: 'Send hug', strength: 'Send strength' };
                  return (
                    <button
                      key={type}
                      onClick={() => handleSendReaction(partnerToday.id, type)}
                      disabled={partnerReactionLoading}
                      className={`p-2 ${colors[type]} rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50`}
                      title={titles[type]}
                    >
                      <span className="text-lg">{emojis[type]}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </>
      ) : userEmoji ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/80 rounded-full border border-gray-600/50">
          <span className="text-xl">💭</span>
          <span className="text-xs font-medium text-gray-400">Partner hasn&apos;t checked in yet</span>
        </div>
      ) : null}
    </div>
  );
});

// ─── Today Preview ────────────────────────────────────────────────────────────

const TodayPreview = memo(function TodayPreview({
  userId,
  recentCheckIns,
  moodOptions,
  selectedMood,
  setSelectedMood,
  setCheckInExpanded,
}: {
  userId: string;
  recentCheckIns: DailyCheckIn[];
  moodOptions: Array<{ emoji: string; label: string; value: string }>;
  selectedMood: string | null;
  setSelectedMood: (mood: string | null) => void;
  setCheckInExpanded: (expanded: boolean) => void;
}) {
  const today = getCurrentDateString();
  const todayCheckIn = recentCheckIns.find(c => c.user_id === userId && c.date === today);
  const last7Days = recentCheckIns.filter(c => c.user_id === userId).slice(0, 7);

  if (todayCheckIn && !selectedMood) {
    return (
      <div className="mt-4 p-4 bg-gradient-to-br from-gray-800/60 to-purple-900/20 rounded-xl border border-purple-700/30">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{moodOptions.find(m => m.value === todayCheckIn.mood)?.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-white">
                Feeling {moodOptions.find(m => m.value === todayCheckIn.mood)?.label} today
              </p>
              <p className="text-xs text-gray-400">
                Checked in {formatTimestamp(todayCheckIn.created_at, 'h:mm a')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedMood(todayCheckIn.mood);
              setCheckInExpanded(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-900/30 rounded-lg transition-colors"
          >
            Update
          </button>
        </div>

        {todayCheckIn.gratitude && (
          <div className="mt-3 p-3 bg-pink-900/20 rounded-lg border border-pink-700/30">
            <p className="text-xs font-medium text-pink-300 mb-1 flex items-center gap-1">
              <Heart className="w-3 h-3" />
              Grateful for:
            </p>
            <p className="text-sm text-gray-300">{todayCheckIn.gratitude}</p>
          </div>
        )}

        {todayCheckIn.highlights && (
          <div className="mt-2 p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/30">
            <p className="text-xs font-medium text-yellow-300 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Highlight:
            </p>
            <p className="text-sm text-gray-300">{todayCheckIn.highlights}</p>
          </div>
        )}

        {todayCheckIn.energy_level && (
          <div className="mt-2 p-3 bg-amber-900/20 rounded-lg border border-amber-700/30">
            <p className="text-xs font-medium text-amber-300 mb-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Energy
            </p>
            <EnergyBar level={todayCheckIn.energy_level} />
          </div>
        )}
      </div>
    );
  }

  // If not checked in today, show 7-day mood trend
  if (!todayCheckIn && last7Days.length > 0) {
    return (
      <div className="mt-4 p-4 bg-gradient-to-br from-gray-800/60 to-blue-900/20 rounded-xl border border-blue-700/30">
        <p className="text-xs font-medium text-gray-400 mb-3">
          Your mood over the last 7 days
        </p>
        <div className="flex items-end justify-between gap-1 h-16 mb-2">
          {[...last7Days].reverse().map((checkIn, idx) => (
            <div key={idx} className="flex-1">
              <div className={`w-full ${moodHeights[checkIn.mood]} ${moodColors[checkIn.mood]} rounded-t transition-all hover:opacity-80`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
});

// ─── Mood Selector ────────────────────────────────────────────────────────────

const MoodSelector = memo(function MoodSelector({
  moodOptions,
  selectedMood,
  handleMoodSelect,
}: {
  moodOptions: Array<{ emoji: string; label: string; value: string }>;
  selectedMood: string | null;
  handleMoodSelect: (mood: string) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 w-full mb-3">
      {moodOptions.map((mood) => {
        const style = moodStyles[mood.value as keyof typeof moodStyles];
        const isSelected = selectedMood === mood.value;

        return (
          <Tooltip key={mood.value} content={`I'm feeling ${mood.label.toLowerCase()} today`} position="top">
            <button
              onClick={() => handleMoodSelect(mood.value)}
              className={`group relative flex flex-col items-center gap-2 transition-all duration-300 transform ${
                isSelected ? 'scale-125' : 'hover:scale-150 active:scale-110'
              }`}
              title={mood.label}
            >
              <div
                className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isSelected
                    ? `${style.bgActive} ring-4 ${style.ring} ${style.glow} shadow-xl`
                    : `${style.bgHover} hover:shadow-lg`
                }`}
              >
                <div
                  className={`text-3xl sm:text-4xl md:text-5xl transition-transform duration-300 ${
                    isSelected ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                >
                  {mood.emoji}
                </div>
                {isSelected && (
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${style.gradient} opacity-20 animate-pulse`} />
                )}
              </div>
              <span
                className={`text-xs sm:text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'opacity-100 text-white'
                    : 'opacity-0 sm:group-hover:opacity-70 text-gray-400'
                }`}
              >
                {mood.label}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
});

// ─── Expanded Form ────────────────────────────────────────────────────────────

const CheckInForm = memo(function CheckInForm({
  selectedMood,
  checkInEnergy,
  setCheckInEnergy,
  checkInHighlights,
  setCheckInHighlights,
  checkInGratitude,
  setCheckInGratitude,
  checkInChallenges,
  setCheckInChallenges,
  checkInNote,
  setCheckInNote,
  checkInSaving,
  handleCheckIn,
}: {
  selectedMood: string;
  checkInEnergy: number | null;
  setCheckInEnergy: (v: number | null) => void;
  checkInHighlights: string;
  setCheckInHighlights: (v: string) => void;
  checkInGratitude: string;
  setCheckInGratitude: (v: string) => void;
  checkInChallenges: string;
  setCheckInChallenges: (v: string) => void;
  checkInNote: string;
  setCheckInNote: (v: string) => void;
  checkInSaving: boolean;
  handleCheckIn: () => Promise<void>;
}) {
  return (
    <div className="space-y-3 mt-4 animate-expand overflow-hidden">
      <EnergySelector value={checkInEnergy} onChange={setCheckInEnergy} />

      {/* Positive moods */}
      {(selectedMood === 'great' || selectedMood === 'good') && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              What went well today? (Optional)
            </label>
            <textarea
              placeholder="Share a win, big or small..."
              value={checkInHighlights}
              onChange={(e) => setCheckInHighlights(e.target.value)}
              maxLength={150}
              className="w-full px-3 py-2 bg-gray-900 border border-green-800 rounded-xl resize-none focus:outline-none focus:border-green-500 text-white text-sm transition-all"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-pink-500" />
              What are you grateful for? (Optional)
            </label>
            <textarea
              placeholder="One thing you appreciate today..."
              value={checkInGratitude}
              onChange={(e) => setCheckInGratitude(e.target.value)}
              maxLength={150}
              className="w-full px-3 py-2 bg-gray-900 border border-pink-800 rounded-xl resize-none focus:outline-none focus:border-pink-500 text-white text-sm transition-all"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Negative moods */}
      {(selectedMood === 'meh' || selectedMood === 'rough') && (
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-blue-500" />
            What&apos;s been challenging? (Optional)
          </label>
          <p className="text-xs text-blue-400 mb-2 italic">
            It&apos;s okay to not be okay. You&apos;re not alone.
          </p>
          <textarea
            placeholder="Share what&apos;s on your mind..."
            value={checkInChallenges}
            onChange={(e) => setCheckInChallenges(e.target.value)}
            maxLength={150}
            className="w-full px-3 py-2 bg-gray-900 border border-blue-800 rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white text-sm transition-all"
            rows={2}
          />
        </div>
      )}

      {/* Neutral mood */}
      {selectedMood === 'okay' && (
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">
            Anything on your mind? (Optional)
          </label>
          <textarea
            placeholder="Share your thoughts..."
            value={checkInNote}
            onChange={(e) => setCheckInNote(e.target.value)}
            maxLength={150}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-white text-sm transition-all"
            rows={2}
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleCheckIn}
          disabled={checkInSaving}
          className={`px-5 py-2 rounded-full text-white text-sm font-semibold transition-all transform flex items-center gap-2 ${
            !checkInSaving
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 hover:scale-105 shadow-md'
              : 'bg-gray-700 cursor-not-allowed opacity-50'
          }`}
        >
          {checkInSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Heart className="w-4 h-4" />
              <span>Check In</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

// ─── Journal Calendar View ────────────────────────────────────────────────────

const JournalCalendarView = memo(function JournalCalendarView({
  calendarMonth,
  setCalendarMonth,
  recentCheckIns,
  moodOptions,
  userId,
}: {
  calendarMonth: Date;
  setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>;
  recentCheckIns: DailyCheckIn[];
  moodOptions: Array<{ emoji: string; label: string; value: string }>;
  userId: string;
}) {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="p-2 hover:bg-pink-900/30 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h3 className="text-lg font-semibold text-white">
          {format(calendarMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="p-2 hover:bg-pink-900/30 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 py-1 sm:py-2">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}

        {/* Empty cells */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = new Date(year, month, day).toISOString().split('T')[0];
          const dayCheckIns = recentCheckIns.filter(c => c.date === dateStr);
          const isToday = getCurrentDateString() === dateStr;

          return (
            <div
              key={day}
              className={`aspect-square p-0.5 sm:p-1 rounded border sm:rounded-lg transition-all ${
                isToday
                  ? 'border-pink-500 bg-pink-900/20'
                  : 'border-gray-700 hover:border-pink-600'
              }`}
            >
              <div className="text-[10px] sm:text-xs text-gray-300 font-medium mb-0.5">{day}</div>
              <div className="flex flex-col gap-0.5">
                {dayCheckIns.map((checkIn, idx) => {
                  const moodEmoji = moodOptions.find(m => m.value === checkIn.mood)?.emoji;
                  const isUser = checkIn.user_id === userId;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] sm:text-[10px] ${
                        isUser
                          ? 'bg-pink-900/40 border border-pink-700/50'
                          : 'bg-purple-900/40 border border-purple-700/50'
                      }`}
                      title={isUser ? 'You' : 'Partner'}
                    >
                      <span className="text-sm sm:text-base leading-none">{moodEmoji}</span>
                      <span className="text-[9px] sm:text-[10px] text-gray-300 truncate font-medium">
                        {isUser ? 'You' : 'Partner'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── Journal List View ────────────────────────────────────────────────────────

const JournalListView = memo(function JournalListView({
  recentCheckIns,
  moodOptions,
  userId,
}: {
  recentCheckIns: DailyCheckIn[];
  moodOptions: Array<{ emoji: string; label: string; value: string }>;
  userId: string;
}) {
  if (recentCheckIns.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No check-ins yet</p>
        <p className="text-xs text-gray-400 mt-1">Start checking in to build your journal</p>
      </div>
    );
  }

  // Group check-ins by date
  const groupedByDate = recentCheckIns.reduce((acc, checkIn) => {
    const date = checkIn.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(checkIn);
    return acc;
  }, {} as Record<string, DailyCheckIn[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
      {sortedDates.map(date => (
        <div key={date} className="space-y-2">
          <div className="sticky top-0 bg-gradient-to-r from-pink-900/60 to-purple-900/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-pink-700/50">
            <p className="text-xs sm:text-sm font-semibold text-white">
              {formatDate(date, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {groupedByDate[date].map((checkIn) => {
            const moodEmoji = moodOptions.find(m => m.value === checkIn.mood)?.emoji;
            const isUser = checkIn.user_id === userId;
            return (
              <div key={checkIn.id} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700 ml-2">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl">{moodEmoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{isUser ? 'You' : 'Partner'}</p>
                      <p className="text-xs text-gray-400">
                        {moodOptions.find(m => m.value === checkIn.mood)?.label}
                      </p>
                    </div>
                  </div>
                </div>
                {checkIn.energy_level && (
                  <div className="mt-2 mb-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <p className="text-xs font-semibold text-gray-300">Energy</p>
                    </div>
                    <div className="ml-5 max-w-32">
                      <EnergyBar level={checkIn.energy_level} />
                    </div>
                  </div>
                )}
                {checkIn.highlights && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-yellow-500" />
                      <p className="text-xs font-semibold text-gray-300">Highlights</p>
                    </div>
                    <p className="text-sm text-gray-400 ml-5">{checkIn.highlights}</p>
                  </div>
                )}
                {checkIn.challenges && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Heart className="w-3 h-3 text-blue-500" />
                      <p className="text-xs font-semibold text-gray-300">Challenges</p>
                    </div>
                    <p className="text-sm text-gray-400 ml-5">{checkIn.challenges}</p>
                  </div>
                )}
                {checkIn.gratitude && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Heart className="w-3 h-3 text-pink-500" />
                      <p className="text-xs font-semibold text-gray-300">Grateful For</p>
                    </div>
                    <p className="text-sm text-gray-400 ml-5">{checkIn.gratitude}</p>
                  </div>
                )}
                {checkIn.note && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-300 mb-1">Note</p>
                    <p className="text-sm text-gray-400">{checkIn.note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});

// ─── Streak Badges ────────────────────────────────────────────────────────────

const StreakBadges = memo(function StreakBadges({
  checkInStats,
}: {
  checkInStats: import('@/lib/services/checkins-service').CheckInStats | null;
}) {
  if (!checkInStats) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {checkInStats.currentStreak > 0 ? (
        <Tooltip
          content={`You've checked in ${checkInStats.currentStreak} days in a row!${
            checkInStats.longestStreak > checkInStats.currentStreak
              ? ` Best: ${checkInStats.longestStreak} days`
              : ' This is your best streak!'
          }`}
        >
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-full cursor-help">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-sm font-bold text-orange-400">{checkInStats.currentStreak}</span>
            <span className="text-xs text-gray-400">day streak</span>
          </div>
        </Tooltip>
      ) : checkInStats.daysSinceLastCheckIn !== null && checkInStats.daysSinceLastCheckIn > 0 ? (
        <Tooltip
          content={`Last check-in was ${checkInStats.daysSinceLastCheckIn} day${
            checkInStats.daysSinceLastCheckIn === 1 ? '' : 's'
          } ago. Check in today to restart your streak!${
            checkInStats.longestStreak > 0 ? ` Your best: ${checkInStats.longestStreak} days` : ''
          }`}
        >
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-gray-800/50 to-slate-800/50 rounded-full cursor-help border border-gray-700">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-bold text-gray-400">{checkInStats.daysSinceLastCheckIn}</span>
            <span className="text-xs text-gray-400">
              day{checkInStats.daysSinceLastCheckIn === 1 ? '' : 's'} ago
            </span>
          </div>
        </Tooltip>
      ) : (
        <Tooltip content="Start your check-in streak today!">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-full cursor-help whitespace-nowrap">
            <Zap className="w-3 h-3 text-orange-500 flex-shrink-0" />
            <span className="text-xs text-gray-400">Start Streak</span>
          </div>
        </Tooltip>
      )}

      {checkInStats.longestStreak > 0 && checkInStats.currentStreak === 0 && (
        <Tooltip content={`Your best streak: ${checkInStats.longestStreak} consecutive days!`}>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-full cursor-help">
            <Trophy className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-sm font-bold text-purple-400">{checkInStats.longestStreak}</span>
            <span className="text-xs text-gray-400">best</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
});

// ─── Animation Variants ──────────────────────────────────────────────────────

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// ─── Main CheckInSection Component ────────────────────────────────────────────

/** Renders the daily check-in section with mood selector and streak tracking. */
export const CheckInSection = memo(function CheckInSection({
  userId,
  spaceId,
}: CheckInSectionProps) {
  const checkIn = useCheckIn({ spaceId, userId });

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:min-h-[600px]"
    >
      {/* Left: Daily Check-In */}
      <div
        id="daily-checkin"
        className="group bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-blue-900/30 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(236,72,153,0.3)] border border-pink-500/20 hover:border-pink-400/50 transition-all duration-300 flex flex-col scroll-mt-24"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Daily Check-In</h2>
            </div>
            <p className="text-xs text-gray-400 ml-7">
              {formatDate(getCurrentDateString(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex items-center gap-0.5 p-0.5 bg-gray-800/50 rounded-full border border-gray-700">
              <Tooltip content="Record your mood and share highlights">
                <button
                  onClick={() => checkIn.setViewMode('checkin')}
                  className={`px-2.5 py-1 rounded-full flex items-center justify-center gap-1 transition-all text-xs font-medium ${
                    checkIn.viewMode === 'checkin'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Heart className="w-3 h-3" />
                  <span>Check In</span>
                </button>
              </Tooltip>
              <Tooltip content="View your mood history and insights">
                <button
                  onClick={() => checkIn.setViewMode('journal')}
                  className={`px-2.5 py-1 rounded-full flex items-center justify-center gap-1 transition-all text-xs font-medium ${
                    checkIn.viewMode === 'journal'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Journal</span>
                </button>
              </Tooltip>
            </div>

            <StreakBadges checkInStats={checkIn.checkInStats} />
          </div>
        </div>

        {/* Check-In Mode */}
        {checkIn.viewMode === 'checkin' && (
          <>
            <PartnerMoodsRow
              userId={userId}
              recentCheckIns={checkIn.recentCheckIns}
              moodOptions={checkIn.moodOptions}
              checkInReactions={checkIn.checkInReactions}
              partnerReactionLoading={checkIn.partnerReactionLoading}
              handleSendReaction={checkIn.handleSendReaction}
            />

            <MoodSelector
              moodOptions={checkIn.moodOptions}
              selectedMood={checkIn.selectedMood}
              handleMoodSelect={checkIn.handleMoodSelect}
            />

            <TodayPreview
              userId={userId}
              recentCheckIns={checkIn.recentCheckIns}
              moodOptions={checkIn.moodOptions}
              selectedMood={checkIn.selectedMood}
              setSelectedMood={checkIn.setSelectedMood}
              setCheckInExpanded={checkIn.setCheckInExpanded}
            />

            {checkIn.checkInExpanded && checkIn.selectedMood && (
              <CheckInForm
                selectedMood={checkIn.selectedMood}
                checkInEnergy={checkIn.checkInEnergy}
                setCheckInEnergy={checkIn.setCheckInEnergy}
                checkInHighlights={checkIn.checkInHighlights}
                setCheckInHighlights={checkIn.setCheckInHighlights}
                checkInGratitude={checkIn.checkInGratitude}
                setCheckInGratitude={checkIn.setCheckInGratitude}
                checkInChallenges={checkIn.checkInChallenges}
                setCheckInChallenges={checkIn.setCheckInChallenges}
                checkInNote={checkIn.checkInNote}
                setCheckInNote={checkIn.setCheckInNote}
                checkInSaving={checkIn.checkInSaving}
                handleCheckIn={checkIn.handleCheckIn}
              />
            )}
          </>
        )}

        {/* Journal Mode */}
        {checkIn.viewMode === 'journal' && (
          <div className="space-y-4">
            {/* Journal View Toggle */}
            <div className="inline-flex items-center gap-1 p-1 bg-gradient-to-r from-pink-900/30 to-purple-900/30 rounded-lg border border-pink-700">
              <button
                onClick={() => checkIn.setJournalView('calendar')}
                className={`px-2 sm:px-3 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all font-medium ${
                  checkIn.journalView === 'calendar'
                    ? 'bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">Calendar</span>
              </button>
              <button
                onClick={() => checkIn.setJournalView('list')}
                className={`px-2 sm:px-3 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all font-medium ${
                  checkIn.journalView === 'list'
                    ? 'bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-xs">List</span>
              </button>
            </div>

            <WeeklyInsights checkIns={checkIn.recentCheckIns} />

            {checkIn.journalView === 'calendar' && (
              <JournalCalendarView
                calendarMonth={checkIn.calendarMonth}
                setCalendarMonth={checkIn.setCalendarMonth}
                recentCheckIns={checkIn.recentCheckIns}
                moodOptions={checkIn.moodOptions}
                userId={userId}
              />
            )}

            {checkIn.journalView === 'list' && (
              <JournalListView
                recentCheckIns={checkIn.recentCheckIns}
                moodOptions={checkIn.moodOptions}
                userId={userId}
              />
            )}
          </div>
        )}
      </div>

      {/* Right: Activity Feed */}
      <div className="group bg-gradient-to-br from-slate-900/30 via-gray-900/20 to-stone-900/10 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(148,163,184,0.3)] border border-gray-500/20 hover:border-gray-400/50 transition-all duration-300 flex flex-col">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <Activity className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg sm:text-xl font-bold text-white">Recent Activity</h2>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2 custom-scrollbar">
          <ActivityFeed spaceId={spaceId} limit={50} />
        </div>
      </div>

      {/* Check-In Success Modal */}
      <CheckInSuccess
        isOpen={checkIn.showCheckInSuccess}
        onClose={() => checkIn.setShowCheckInSuccess(false)}
        mood={checkIn.lastCheckInMood}
        streak={checkIn.checkInStats?.currentStreak || 0}
      />
    </motion.div>
  );
});
