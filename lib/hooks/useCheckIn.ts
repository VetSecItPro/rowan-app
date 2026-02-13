'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { checkInsService, type DailyCheckIn, type CheckInStats } from '@/lib/services/checkins-service';
import { reactionsService, type CheckInReaction } from '@/lib/services/reactions-service';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface UseCheckInProps {
  spaceId: string | undefined;
  userId: string | undefined;
}

export interface CheckInState {
  // Form state
  selectedMood: string | null;
  checkInNote: string;
  checkInHighlights: string;
  checkInChallenges: string;
  checkInGratitude: string;
  checkInEnergy: number | null;
  checkInExpanded: boolean;
  checkInSaving: boolean;

  // View state
  viewMode: 'checkin' | 'journal';
  journalView: 'list' | 'calendar';
  calendarMonth: Date;

  // Data
  recentCheckIns: DailyCheckIn[];
  checkInStats: CheckInStats | null;
  checkInReactions: Record<string, CheckInReaction[]>;
  partnerReactionLoading: boolean;

  // Success modal
  showCheckInSuccess: boolean;
  lastCheckInMood: string;

  // Mood options
  moodOptions: Array<{ emoji: string; label: string; value: string }>;
}

export interface CheckInActions {
  setSelectedMood: (mood: string | null) => void;
  setCheckInNote: (note: string) => void;
  setCheckInHighlights: (highlights: string) => void;
  setCheckInChallenges: (challenges: string) => void;
  setCheckInGratitude: (gratitude: string) => void;
  setCheckInEnergy: (energy: number | null) => void;
  setCheckInExpanded: (expanded: boolean) => void;
  setViewMode: (mode: 'checkin' | 'journal') => void;
  setJournalView: (view: 'list' | 'calendar') => void;
  setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>;
  setShowCheckInSuccess: (show: boolean) => void;
  handleMoodSelect: (mood: string) => void;
  handleCheckIn: () => Promise<void>;
  handleSendReaction: (checkinId: string, reactionType: 'heart' | 'hug' | 'strength') => Promise<void>;
}

export function useCheckIn({ spaceId, userId }: UseCheckInProps): CheckInState & CheckInActions {
  // Form state
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [checkInNote, setCheckInNote] = useState('');
  const [checkInHighlights, setCheckInHighlights] = useState('');
  const [checkInChallenges, setCheckInChallenges] = useState('');
  const [checkInGratitude, setCheckInGratitude] = useState('');
  const [checkInEnergy, setCheckInEnergy] = useState<number | null>(null);
  const [checkInExpanded, setCheckInExpanded] = useState(false);
  const [checkInSaving, setCheckInSaving] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<'checkin' | 'journal'>('checkin');
  const [journalView, setJournalView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Data
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckIn[]>([]);
  const [checkInStats, setCheckInStats] = useState<CheckInStats | null>(null);
  const [checkInReactions, setCheckInReactions] = useState<Record<string, CheckInReaction[]>>({});
  const [partnerReactionLoading, setPartnerReactionLoading] = useState(false);

  // Success modal
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [lastCheckInMood, setLastCheckInMood] = useState('');

  // Mood options
  const moodOptions = useMemo(() => [
    { emoji: '😊', label: 'Great', value: 'great' },
    { emoji: '🙂', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '😔', label: 'Meh', value: 'meh' },
    { emoji: '😫', label: 'Rough', value: 'rough' },
  ], []);

  // Load check-ins data and subscribe to updates
  useEffect(() => {
    if (!spaceId || !userId) return;

    const supabase = createClient();

    const loadCheckIns = async () => {
      try {
        const recent = await checkInsService.getCheckIns(spaceId, 7);
        setRecentCheckIns(recent);

        const stats = await checkInsService.getCheckInStats(spaceId, userId);
        setCheckInStats(stats);

        const today = await checkInsService.getTodayCheckIn(spaceId, userId);

        // Load reactions for all check-ins
        const reactionsMap: Record<string, CheckInReaction[]> = {};
        await Promise.all(
          recent.map(async (checkIn) => {
            try {
              const reactions = await reactionsService.getReactionsForCheckIn(checkIn.id);
              reactionsMap[checkIn.id] = reactions;
            } catch (error) {
              logger.error('Failed to load reactions for check-in:', error, { component: 'useCheckIn', action: 'execution' });
              reactionsMap[checkIn.id] = [];
            }
          })
        );
        setCheckInReactions(reactionsMap);

        // Pre-populate form if user already checked in today
        if (today) {
          setSelectedMood(today.mood);
          setCheckInNote(today.note || '');
          setCheckInHighlights(today.highlights || '');
          setCheckInChallenges(today.challenges || '');
          setCheckInGratitude(today.gratitude || '');
          setCheckInEnergy(today.energy_level ?? null);
          setCheckInExpanded(true);
        }
      } catch (error) {
        logger.error('Failed to load check-ins:', error, { component: 'useCheckIn', action: 'execution' });
      }
    };

    loadCheckIns();

    // Subscribe to real-time check-in updates
    const channel = checkInsService.subscribeToCheckIns(spaceId, () => {
      loadCheckIns();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, userId]);

  // Handle mood selection with smart expansion
  const handleMoodSelect = useCallback((mood: string) => {
    setSelectedMood(mood);
    setCheckInExpanded(true);
  }, []);

  // Handle check-in submission
  const handleCheckIn = useCallback(async () => {
    if (!selectedMood || !userId || !spaceId) return;

    setCheckInSaving(true);
    try {
      await checkInsService.createCheckIn(userId, {
        space_id: spaceId,
        mood: selectedMood,
        energy_level: checkInEnergy ?? undefined,
        note: checkInNote || undefined,
        highlights: checkInHighlights || undefined,
        challenges: checkInChallenges || undefined,
        gratitude: checkInGratitude || undefined,
      });

      setLastCheckInMood(selectedMood);
      setSelectedMood(null);
      setCheckInNote('');
      setCheckInHighlights('');
      setCheckInChallenges('');
      setCheckInGratitude('');
      setCheckInEnergy(null);
      setCheckInExpanded(false);

      // Reload stats and recent check-ins
      const stats = await checkInsService.getCheckInStats(spaceId, userId);
      setCheckInStats(stats);

      const recent = await checkInsService.getCheckIns(spaceId, 7);
      setRecentCheckIns(recent);

      setShowCheckInSuccess(true);
    } catch (error) {
      logger.error('Failed to create check-in:', error, { component: 'useCheckIn', action: 'execution' });
    } finally {
      setCheckInSaving(false);
    }
  }, [selectedMood, checkInNote, checkInHighlights, checkInChallenges, checkInGratitude, checkInEnergy, userId, spaceId]);

  // Handle sending a reaction to partner's check-in
  const handleSendReaction = useCallback(async (
    checkinId: string,
    reactionType: 'heart' | 'hug' | 'strength'
  ) => {
    if (!userId) return;

    setPartnerReactionLoading(true);
    try {
      const reaction = await reactionsService.createReaction(userId, {
        checkin_id: checkinId,
        reaction_type: reactionType,
      });

      setCheckInReactions((prev) => ({
        ...prev,
        [checkinId]: [reaction],
      }));
    } catch (error) {
      logger.error('Failed to send reaction:', error, { component: 'useCheckIn', action: 'execution' });
    } finally {
      setPartnerReactionLoading(false);
    }
  }, [userId]);

  return {
    // State
    selectedMood,
    checkInNote,
    checkInHighlights,
    checkInChallenges,
    checkInGratitude,
    checkInEnergy,
    checkInExpanded,
    checkInSaving,
    viewMode,
    journalView,
    calendarMonth,
    recentCheckIns,
    checkInStats,
    checkInReactions,
    partnerReactionLoading,
    showCheckInSuccess,
    lastCheckInMood,
    moodOptions,

    // Actions
    setSelectedMood,
    setCheckInNote,
    setCheckInHighlights,
    setCheckInChallenges,
    setCheckInGratitude,
    setCheckInEnergy,
    setCheckInExpanded,
    setViewMode,
    setJournalView,
    setCalendarMonth,
    setShowCheckInSuccess,
    handleMoodSelect,
    handleCheckIn,
    handleSendReaction,
  };
}
