import { createClient } from '@/lib/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface DailyCheckIn {
  id: string;
  user_id: string;
  space_id: string;
  date: string;
  mood: string;
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
  note?: string;
  highlights?: string;
  challenges?: string;
  gratitude?: string;
  date?: string; // Optional, defaults to today
}

export interface CheckInStats {
  currentStreak: number;
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
    const today = format(new Date(), 'yyyy-MM-dd');

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
    const date = input.date || format(new Date(), 'yyyy-MM-dd');

    // Use upsert to create or update
    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert({
        user_id: userId,
        space_id: input.space_id,
        date,
        mood: input.mood,
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

    // Calculate current streak
    let currentStreak = 0;
    const sortedDates = checkIns
      .map(c => new Date(c.date))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDates.length > 0) {
      let checkDate = new Date();
      for (const checkInDate of sortedDates) {
        const checkInDay = format(checkInDate, 'yyyy-MM-dd');
        const expectedDay = format(checkDate, 'yyyy-MM-dd');

        if (checkInDay === expectedDay) {
          currentStreak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
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

    checkIns.forEach(checkIn => {
      const mood = checkIn.mood?.toLowerCase();
      if (mood in moodDistribution) {
        moodDistribution[mood as keyof typeof moodDistribution]++;
      }
    });

    // Count check-ins by time period
    const thisWeek = checkIns.filter(c => new Date(c.date) >= weekAgo).length;
    const thisMonth = checkIns.filter(c => new Date(c.date) >= monthAgo).length;

    return {
      currentStreak,
      totalCheckIns: checkIns.length,
      thisWeek,
      thisMonth,
      moodDistribution,
    };
  },

  /**
   * Subscribe to check-in changes for a space
   */
  subscribeToCheckIns(spaceId: string, callback: (payload: any) => void) {
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
