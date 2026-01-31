import { createClient } from '@/lib/supabase/client';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { getCurrentDateString } from '@/lib/utils/date-utils';

export interface DailyCheckIn {
  id: string;
  user_id: string;
  space_id: string;
  date: string;
  mood: string;
  energy_level?: number;
  note?: string;
  highlights?: string;
  challenges?: string;
  gratitude?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckInInput {
  space_id: string;
  mood: string;
  energy_level?: number;
  note?: string;
  highlights?: string;
  challenges?: string;
  gratitude?: string;
  date?: string; // Optional, defaults to today
}

export interface CheckInStats {
  currentStreak: number;
  longestStreak: number;
  daysSinceLastCheckIn: number | null; // null if never checked in
  totalCheckIns: number;
  thisWeek: number;
  thisMonth: number;
  moodDistribution: {
    great: number;
    good: number;
    okay: number;
    meh: number;
    rough: number;
  };
}

export const checkInsService = {
  /**
   * Get all check-ins for a space (includes all members' check-ins)
   */
  async getCheckIns(spaceId: string, limit = 30): Promise<DailyCheckIn[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('space_id', spaceId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get today's check-in for the current user
   */
  async getTodayCheckIn(spaceId: string, userId: string): Promise<DailyCheckIn | null> {
    const supabase = createClient();
    const today = getCurrentDateString();

    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get check-ins for a specific user
   */
  async getUserCheckIns(spaceId: string, userId: string, limit = 30): Promise<DailyCheckIn[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get check-ins for a specific date range
   */
  async getCheckInsByDateRange(
    spaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyCheckIn[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('space_id', spaceId)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create or update a check-in (upsert based on user_id, space_id, date)
   */
  async createCheckIn(userId: string, input: CreateCheckInInput): Promise<DailyCheckIn> {
    const supabase = createClient();
    const date = input.date || getCurrentDateString();

    // Use upsert to create or update
    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert({
        user_id: userId,
        space_id: input.space_id,
        date,
        mood: input.mood,
        energy_level: input.energy_level,
        note: input.note,
        highlights: input.highlights,
        challenges: input.challenges,
        gratitude: input.gratitude,
      }, {
        onConflict: 'user_id,space_id,date',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a check-in
   */
  async updateCheckIn(
    id: string,
    updates: Partial<Omit<DailyCheckIn, 'id' | 'user_id' | 'space_id' | 'date' | 'created_at' | 'updated_at'>>
  ): Promise<DailyCheckIn> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_checkins')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a check-in
   */
  async deleteCheckIn(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('daily_checkins')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get check-in statistics for a user
   */
  async getCheckInStats(spaceId: string, userId: string): Promise<CheckInStats> {
    const supabase = createClient();

    // Get all check-ins for the user
    const { data: allCheckIns, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    const checkIns = allCheckIns || [];
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    // Calculate current streak and longest streak
    // Use string comparison directly to avoid timezone issues
    // Dates are stored as 'yyyy-MM-dd' strings
    let currentStreak = 0;
    let longestStreak = 0;
    let daysSinceLastCheckIn: number | null = null;
    const today = getCurrentDateString(); // e.g. '2025-12-08'

    // Get unique sorted date strings (most recent first)
    const sortedDates = [...new Set(checkIns.map((c: { date: string }) => c.date))] as string[];
    sortedDates.sort((a, b) => b.localeCompare(a));

    if (sortedDates.length > 0) {
      // Calculate days since last check-in
      const lastCheckInDate = sortedDates[0];
      const todayDate = parseISO(today);
      const lastDate = parseISO(lastCheckInDate);
      daysSinceLastCheckIn = differenceInDays(todayDate, lastDate);

      // Calculate current streak (starting from today)
      let expectedDate = today;

      for (const checkInDate of sortedDates) {
        if (checkInDate === expectedDate) {
          currentStreak++;
          // Calculate previous day using parseISO to get proper Date object
          const prevDate = subDays(parseISO(expectedDate), 1);
          expectedDate = format(prevDate, 'yyyy-MM-dd');
        } else if (checkInDate < expectedDate) {
          // This check-in is older than expected, streak is broken
          break;
        }
        // If checkInDate > expectedDate, skip (duplicate or future date)
      }

      // Calculate longest streak (iterate through all dates)
      // Sort dates in ascending order for this calculation
      const ascendingDates = [...sortedDates].sort((a, b) => a.localeCompare(b));
      let tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < ascendingDates.length; i++) {
        const prevDate = parseISO(ascendingDates[i - 1]);
        const currDate = parseISO(ascendingDates[i]);
        const dayDiff = differenceInDays(currDate, prevDate);

        if (dayDiff === 1) {
          // Consecutive day
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          // Gap in days, reset temp streak
          tempStreak = 1;
        }
      }
    }

    // Calculate mood distribution
    const moodDistribution = {
      great: 0,
      good: 0,
      okay: 0,
      meh: 0,
      rough: 0,
    };

    checkIns.forEach((checkIn: { mood?: string; date: string }) => {
      const mood = checkIn.mood?.toLowerCase();
      if (mood && mood in moodDistribution) {
        moodDistribution[mood as keyof typeof moodDistribution]++;
      }
    });

    // Count check-ins by time period
    // Use parseISO to properly handle date strings in local timezone
    const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');
    const monthAgoStr = format(monthAgo, 'yyyy-MM-dd');
    const thisWeek = checkIns.filter((c: { date: string }) => c.date >= weekAgoStr).length;
    const thisMonth = checkIns.filter((c: { date: string }) => c.date >= monthAgoStr).length;

    return {
      currentStreak,
      longestStreak,
      daysSinceLastCheckIn,
      totalCheckIns: checkIns.length,
      thisWeek,
      thisMonth,
      moodDistribution,
    };
  },

  /**
   * Subscribe to check-in changes for a space
   */
  subscribeToCheckIns(spaceId: string, callback: (payload: { new: DailyCheckIn; old: DailyCheckIn | null; eventType: string }) => void) {
    const supabase = createClient();
    const channel = supabase
      .channel(`checkins:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_checkins',
          filter: `space_id=eq.${spaceId}`,
        },
        callback
      )
      .subscribe();

    return channel;
  },
};
