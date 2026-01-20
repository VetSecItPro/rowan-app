import { subDays, startOfWeek, endOfWeek } from 'date-fns';
import type { DailyCheckIn } from '@/lib/services/checkins-service';

export interface MoodInsight {
  type: 'pattern' | 'streak' | 'trend' | 'suggestion';
  title: string;
  description: string;
  severity: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-100
}

export interface WeeklyMoodSummary {
  weekStart: Date;
  weekEnd: Date;
  moodDistribution: {
    great: number;
    good: number;
    okay: number;
    meh: number;
    rough: number;
  };
  dominantMood: string;
  averageScore: number; // 1-5 scale
  insights: MoodInsight[];
}

export interface MoodPattern {
  pattern: string; // e.g., "monday_blues", "friday_high", "weekend_dip"
  confidence: number;
  description: string;
  occurrences: number;
}

export const moodInsightsService = {
  /**
   * Calculate mood score (1-5 scale)
   */
  getMoodScore(mood: string): number {
    const scores: Record<string, number> = {
      great: 5,
      good: 4,
      okay: 3,
      meh: 2,
      rough: 1,
    };
    return scores[mood] || 3;
  },

  /**
   * Get weekly mood summary with insights
   */
  getWeeklySummary(checkIns: DailyCheckIn[]): WeeklyMoodSummary {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    // Filter check-ins for this week
    const weekCheckIns = checkIns.filter((c) => {
      const checkInDate = new Date(c.date);
      return checkInDate >= weekStart && checkInDate <= weekEnd;
    });

    // Calculate mood distribution
    const distribution = {
      great: 0,
      good: 0,
      okay: 0,
      meh: 0,
      rough: 0,
    };

    let totalScore = 0;
    weekCheckIns.forEach((checkIn) => {
      const mood = checkIn.mood?.toLowerCase();
      if (mood in distribution) {
        distribution[mood as keyof typeof distribution]++;
        totalScore += this.getMoodScore(mood);
      }
    });

    // Find dominant mood
    const dominantMood = Object.entries(distribution).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0];

    const averageScore = weekCheckIns.length > 0 ? totalScore / weekCheckIns.length : 3;

    // Generate insights
    const insights = this.generateWeeklyInsights(weekCheckIns, distribution, averageScore);

    return {
      weekStart,
      weekEnd,
      moodDistribution: distribution,
      dominantMood,
      averageScore,
      insights,
    };
  },

  /**
   * Detect mood patterns (e.g., Monday blues, Friday highs)
   */
  detectPatterns(checkIns: DailyCheckIn[]): MoodPattern[] {
    const patterns: MoodPattern[] = [];

    // Group check-ins by day of week
    const dayGroups: Record<number, DailyCheckIn[]> = {};
    checkIns.forEach((checkIn) => {
      const day = new Date(checkIn.date).getDay();
      if (!dayGroups[day]) dayGroups[day] = [];
      dayGroups[day].push(checkIn);
    });

    // Detect Monday blues
    const mondays = dayGroups[1] || [];
    if (mondays.length >= 3) {
      const lowMondays = mondays.filter((c) =>
        ['meh', 'rough'].includes(c.mood?.toLowerCase() || '')
      );
      if (lowMondays.length / mondays.length >= 0.6) {
        patterns.push({
          pattern: 'monday_blues',
          confidence: Math.round((lowMondays.length / mondays.length) * 100),
          description: 'You tend to feel lower on Mondays. Consider planning something enjoyable to start your week.',
          occurrences: lowMondays.length,
        });
      }
    }

    // Detect Friday highs
    const fridays = dayGroups[5] || [];
    if (fridays.length >= 3) {
      const highFridays = fridays.filter((c) =>
        ['great', 'good'].includes(c.mood?.toLowerCase() || '')
      );
      if (highFridays.length / fridays.length >= 0.6) {
        patterns.push({
          pattern: 'friday_high',
          confidence: Math.round((highFridays.length / fridays.length) * 100),
          description: 'Fridays lift your mood! You finish the week strong.',
          occurrences: highFridays.length,
        });
      }
    }

    // Detect consistent low periods
    const recentLows = checkIns
      .slice(0, 5)
      .filter((c) => ['meh', 'rough'].includes(c.mood?.toLowerCase() || ''));
    if (recentLows.length >= 4) {
      patterns.push({
        pattern: 'recent_low_period',
        confidence: 85,
        description: "You've been feeling down recently. Consider reaching out for support or trying a mood-boosting activity.",
        occurrences: recentLows.length,
      });
    }

    // Detect improvement trend
    if (checkIns.length >= 7) {
      const recent = checkIns.slice(0, 3);
      const older = checkIns.slice(3, 6);
      const recentAvg =
        recent.reduce((sum, c) => sum + this.getMoodScore(c.mood), 0) / recent.length;
      const olderAvg =
        older.reduce((sum, c) => sum + this.getMoodScore(c.mood), 0) / older.length;

      if (recentAvg - olderAvg >= 1) {
        patterns.push({
          pattern: 'improving_trend',
          confidence: 75,
          description: 'Your mood has been improving lately! Keep up whatever you\'re doing.',
          occurrences: 0,
        });
      }
    }

    return patterns;
  },

  /**
   * Generate insights based on weekly data
   */
  generateWeeklyInsights(
    checkIns: DailyCheckIn[],
    distribution: Record<string, number>,
    averageScore: number
  ): MoodInsight[] {
    const insights: MoodInsight[] = [];

    // Average score insight
    if (averageScore >= 4.5) {
      insights.push({
        type: 'trend',
        title: 'Excellent Week!',
        description: "You're having a great week! Your mood has been consistently positive.",
        severity: 'positive',
        confidence: 95,
      });
    } else if (averageScore <= 2) {
      insights.push({
        type: 'trend',
        title: 'Challenging Week',
        description: 'This week has been tough. Remember to practice self-care and reach out for support.',
        severity: 'negative',
        confidence: 90,
      });
    }

    // Streak insight
    if (checkIns.length >= 7) {
      insights.push({
        type: 'streak',
        title: 'Consistency Champion',
        description: `You've checked in every day this week! Consistency builds self-awareness.`,
        severity: 'positive',
        confidence: 100,
      });
    }

    // Gratitude insight
    const withGratitude = checkIns.filter((c) => c.gratitude && c.gratitude.length > 0);
    if (withGratitude.length >= 5) {
      insights.push({
        type: 'pattern',
        title: 'Gratitude Practice',
        description: 'You\'re building a strong gratitude practice. Studies show this improves overall well-being.',
        severity: 'positive',
        confidence: 85,
      });
    }

    // Challenges shared insight
    const withChallenges = checkIns.filter((c) => c.challenges && c.challenges.length > 0);
    if (withChallenges.length >= 3) {
      insights.push({
        type: 'suggestion',
        title: 'Sharing Challenges',
        description: 'You\'re being open about difficulties. This self-awareness is a strength.',
        severity: 'neutral',
        confidence: 80,
      });
    }

    return insights;
  },

  /**
   * Get monthly emotional health report
   */
  getMonthlyReport(checkIns: DailyCheckIn[]) {
    const last30Days = checkIns.filter((c) => {
      const checkInDate = new Date(c.date);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return checkInDate >= thirtyDaysAgo;
    });

    const distribution = {
      great: 0,
      good: 0,
      okay: 0,
      meh: 0,
      rough: 0,
    };

    last30Days.forEach((checkIn) => {
      const mood = checkIn.mood?.toLowerCase();
      if (mood in distribution) {
        distribution[mood as keyof typeof distribution]++;
      }
    });

    const totalCheckIns = last30Days.length;
    const checkInRate = (totalCheckIns / 30) * 100;

    const positiveCount = distribution.great + distribution.good;
    const positiveRatio = totalCheckIns > 0 ? (positiveCount / totalCheckIns) * 100 : 0;

    return {
      period: '30 days',
      totalCheckIns,
      checkInRate: Math.round(checkInRate),
      distribution,
      positiveRatio: Math.round(positiveRatio),
      patterns: this.detectPatterns(last30Days),
      insights: this.generateMonthlyInsights(last30Days, positiveRatio),
    };
  },

  /**
   * Generate monthly insights
   */
  generateMonthlyInsights(checkIns: DailyCheckIn[], positiveRatio: number): MoodInsight[] {
    const insights: MoodInsight[] = [];

    if (positiveRatio >= 70) {
      insights.push({
        type: 'trend',
        title: 'Thriving This Month',
        description: `${Math.round(positiveRatio)}% of your days have been positive. You're doing great!`,
        severity: 'positive',
        confidence: 90,
      });
    } else if (positiveRatio <= 30) {
      insights.push({
        type: 'suggestion',
        title: 'Support Recommended',
        description: 'This month has been challenging. Consider reaching out to a counselor or trusted friend.',
        severity: 'negative',
        confidence: 85,
      });
    }

    const withHighlights = checkIns.filter((c) => c.highlights && c.highlights.length > 0);
    if (withHighlights.length >= 20) {
      insights.push({
        type: 'pattern',
        title: 'Celebrating Wins',
        description: `You've shared ${withHighlights.length} highlights this month. Acknowledging positives builds resilience.`,
        severity: 'positive',
        confidence: 85,
      });
    }

    return insights;
  },
};
