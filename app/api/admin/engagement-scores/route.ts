/**
 * Engagement Scores API Route
 * GET /api/admin/engagement-scores - Get user engagement metrics
 *
 * Provides:
 * - Composite engagement score per user (recency, frequency, breadth)
 * - Score distribution across user base
 * - Feature adoption matrix (tried, weekly active, daily active)
 * - Session duration estimates
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

// All trackable features
const ALL_FEATURES = [
  'dashboard', 'tasks', 'calendar', 'reminders', 'shopping',
  'meals', 'messages', 'goals', 'household', 'projects',
  'expenses', 'rewards', 'checkin', 'settings',
] as const;

interface ScoreDistribution {
  excellent: number;
  good: number;
  average: number;
  low: number;
  inactive: number;
}

interface TopUser {
  userId: string;
  email: string;
  score: number;
  lastActive: string;
  featuresUsed: number;
}

interface AdoptionEntry {
  feature: string;
  triedItPct: number;
  weeklyActivePct: number;
  dailyActivePct: number;
}

interface SessionStats {
  avgDurationMinutes: number;
  medianDurationMinutes: number;
  totalSessions: number;
}

interface EngagementData {
  scoreDistribution: ScoreDistribution;
  averageScore: number;
  topUsers: TopUser[];
  adoptionMatrix: AdoptionEntry[];
  sessions: SessionStats;
  lastUpdated: string;
}

/**
 * Calculate recency score (0-40) based on days since last activity.
 */
function calculateRecencyScore(daysSinceLastActive: number): number {
  if (daysSinceLastActive <= 0) return 40;
  if (daysSinceLastActive <= 3) return 32;
  if (daysSinceLastActive <= 7) return 24;
  if (daysSinceLastActive <= 14) return 16;
  if (daysSinceLastActive <= 30) return 8;
  return 0;
}

/**
 * Calculate frequency score (0-30) based on distinct active days in last 30 days.
 */
function calculateFrequencyScore(activeDays: number): number {
  if (activeDays >= 20) return 30;
  if (activeDays >= 15) return 24;
  if (activeDays >= 10) return 18;
  if (activeDays >= 5) return 12;
  if (activeDays >= 1) return 6;
  return 0;
}

/**
 * Calculate breadth score (0-30) based on distinct features used in last 30 days.
 */
function calculateBreadthScore(featuresUsed: number): number {
  if (featuresUsed >= 7) return 30;
  if (featuresUsed >= 5) return 24;
  if (featuresUsed >= 3) return 18;
  if (featuresUsed >= 2) return 12;
  if (featuresUsed >= 1) return 6;
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify admin authentication
    const auth = await verifyAdminAuth(request);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';

    const engagement = await withCache<EngagementData>(
      ADMIN_CACHE_KEYS.engagementScores,
      async () => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Fetch all data in parallel
        const [usersResult, recentEventsResult, allTimeEventsResult, sessionEventsResult] = await Promise.allSettled([
          // All users
          supabaseAdmin
            .from('users')
            .select('id, email, last_seen')
            .limit(50000),

          // Feature events from last 30 days (for engagement scoring)
          supabaseAdmin
            .from('feature_events')
            .select('user_id, feature, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(100000),

          // All-time feature events for adoption "tried it" metric (distinct user-feature pairs)
          supabaseAdmin
            .from('feature_events')
            .select('user_id, feature')
            .limit(100000),

          // Session events for duration calculation (last 30 days)
          supabaseAdmin
            .from('feature_events')
            .select('session_id, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .not('session_id', 'is', null)
            .order('session_id', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(100000),
        ]);

        const users = usersResult.status === 'fulfilled' ? (usersResult.value.data || []) : [];
        const recentEvents = recentEventsResult.status === 'fulfilled' ? (recentEventsResult.value.data || []) : [];
        const allTimeEvents = allTimeEventsResult.status === 'fulfilled' ? (allTimeEventsResult.value.data || []) : [];
        const sessionEvents = sessionEventsResult.status === 'fulfilled' ? (sessionEventsResult.value.data || []) : [];

        const totalUsers = users.length;

        // ─── 1. Engagement Scores ───────────────────────────────────────

        // Build per-user metrics from recent events
        const userMetrics: Record<string, {
          lastEventDate: Date;
          activeDays: Set<string>;
          features: Set<string>;
        }> = {};

        for (const event of recentEvents) {
          if (!event.user_id) continue;
          if (!userMetrics[event.user_id]) {
            userMetrics[event.user_id] = {
              lastEventDate: new Date(event.created_at),
              activeDays: new Set(),
              features: new Set(),
            };
          }
          const metrics = userMetrics[event.user_id];
          const eventDate = new Date(event.created_at);
          if (eventDate > metrics.lastEventDate) {
            metrics.lastEventDate = eventDate;
          }
          metrics.activeDays.add(event.created_at.split('T')[0]);
          metrics.features.add(event.feature);
        }

        // Calculate scores for each user
        const userScores: { userId: string; email: string; score: number; lastActive: string; featuresUsed: number }[] = [];

        const scoreDistribution: ScoreDistribution = {
          excellent: 0,
          good: 0,
          average: 0,
          low: 0,
          inactive: 0,
        };

        let totalScore = 0;

        for (const user of users) {
          const metrics = userMetrics[user.id];

          let score: number;
          let lastActive: string;
          let featuresUsed: number;

          if (metrics) {
            const daysSinceLastActive = Math.floor(
              (now.getTime() - metrics.lastEventDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const recency = calculateRecencyScore(daysSinceLastActive);
            const frequency = calculateFrequencyScore(metrics.activeDays.size);
            const breadth = calculateBreadthScore(metrics.features.size);
            score = recency + frequency + breadth;
            lastActive = metrics.lastEventDate.toISOString();
            featuresUsed = metrics.features.size;
          } else {
            // No recent events — check last_seen for some recency signal
            if (user.last_seen) {
              const daysSinceLastSeen = Math.floor(
                (now.getTime() - new Date(user.last_seen).getTime()) / (1000 * 60 * 60 * 24)
              );
              score = calculateRecencyScore(daysSinceLastSeen);
            } else {
              score = 0;
            }
            lastActive = user.last_seen || '';
            featuresUsed = 0;
          }

          totalScore += score;

          // Classify into distribution bucket
          if (score >= 80) scoreDistribution.excellent++;
          else if (score >= 60) scoreDistribution.good++;
          else if (score >= 40) scoreDistribution.average++;
          else if (score >= 20) scoreDistribution.low++;
          else scoreDistribution.inactive++;

          userScores.push({
            userId: user.id,
            email: user.email || '',
            score,
            lastActive,
            featuresUsed,
          });
        }

        // Sort and take top 10
        userScores.sort((a, b) => b.score - a.score);
        const topUsers = userScores.slice(0, 10);

        const averageScore = totalUsers > 0
          ? Math.round((totalScore / totalUsers) * 10) / 10
          : 0;

        // ─── 2. Feature Adoption Matrix ─────────────────────────────────

        // All-time: which users have tried each feature
        const allTimeUserFeatures: Record<string, Set<string>> = {};
        for (const event of allTimeEvents) {
          if (!event.user_id) continue;
          if (!allTimeUserFeatures[event.feature]) {
            allTimeUserFeatures[event.feature] = new Set();
          }
          allTimeUserFeatures[event.feature].add(event.user_id);
        }

        // Weekly and daily active per feature (from recent events)
        const weeklyUserFeatures: Record<string, Set<string>> = {};
        const dailyUserFeatures: Record<string, Set<string>> = {};

        for (const event of recentEvents) {
          if (!event.user_id) continue;
          const eventDate = new Date(event.created_at);

          if (eventDate >= sevenDaysAgo) {
            if (!weeklyUserFeatures[event.feature]) {
              weeklyUserFeatures[event.feature] = new Set();
            }
            weeklyUserFeatures[event.feature].add(event.user_id);
          }

          if (eventDate >= oneDayAgo) {
            if (!dailyUserFeatures[event.feature]) {
              dailyUserFeatures[event.feature] = new Set();
            }
            dailyUserFeatures[event.feature].add(event.user_id);
          }
        }

        const adoptionMatrix: AdoptionEntry[] = ALL_FEATURES.map((feature) => {
          const triedCount = allTimeUserFeatures[feature]?.size || 0;
          const weeklyCount = weeklyUserFeatures[feature]?.size || 0;
          const dailyCount = dailyUserFeatures[feature]?.size || 0;

          return {
            feature,
            triedItPct: totalUsers > 0 ? Math.round((triedCount / totalUsers) * 1000) / 10 : 0,
            weeklyActivePct: totalUsers > 0 ? Math.round((weeklyCount / totalUsers) * 1000) / 10 : 0,
            dailyActivePct: totalUsers > 0 ? Math.round((dailyCount / totalUsers) * 1000) / 10 : 0,
          };
        });

        // ─── 3. Session Duration Estimates ──────────────────────────────

        // Group events by session_id
        const sessions: Record<string, Date[]> = {};
        for (const event of sessionEvents) {
          if (!event.session_id) continue;
          if (!sessions[event.session_id]) {
            sessions[event.session_id] = [];
          }
          sessions[event.session_id].push(new Date(event.created_at));
        }

        // Calculate durations for valid sessions (2+ events, < 2 hours)
        const twoHoursMs = 2 * 60 * 60 * 1000;
        const validDurations: number[] = [];

        for (const timestamps of Object.values(sessions)) {
          if (timestamps.length < 2) continue;

          // Timestamps are already sorted by created_at from the query
          const first = timestamps[0];
          const last = timestamps[timestamps.length - 1];
          const durationMs = last.getTime() - first.getTime();

          if (durationMs > 0 && durationMs < twoHoursMs) {
            validDurations.push(durationMs);
          }
        }

        // Calculate average and median
        let avgDurationMinutes = 0;
        let medianDurationMinutes = 0;

        if (validDurations.length > 0) {
          const totalDurationMs = validDurations.reduce((sum, d) => sum + d, 0);
          avgDurationMinutes = Math.round((totalDurationMs / validDurations.length / 60000) * 10) / 10;

          // Median
          validDurations.sort((a, b) => a - b);
          const mid = Math.floor(validDurations.length / 2);
          const medianMs = validDurations.length % 2 === 0
            ? (validDurations[mid - 1] + validDurations[mid]) / 2
            : validDurations[mid];
          medianDurationMinutes = Math.round((medianMs / 60000) * 10) / 10;
        }

        return {
          scoreDistribution,
          averageScore,
          topUsers,
          adoptionMatrix,
          sessions: {
            avgDurationMinutes,
            medianDurationMinutes,
            totalSessions: validDurations.length,
          },
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.engagementScores, skipCache: forceRefresh }
    );

    return NextResponse.json({
      success: true,
      engagement,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/engagement-scores',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/engagement-scores GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch engagement scores' },
      { status: 500 }
    );
  }
}
