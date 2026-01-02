/**
 * Retention Analytics API Route
 * GET /api/admin/retention - Get retention metrics (DAU/MAU, cohorts, churn)
 *
 * Provides:
 * - Daily/Weekly/Monthly Active Users
 * - Stickiness ratio (DAU/MAU)
 * - Cohort retention analysis
 * - Churn metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Query parameter validation schema
const QueryParamsSchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('30d'),
  refresh: z.enum(['true', 'false']).optional(),
});

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface CohortData {
  cohort: string;
  users: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

interface RetentionMetrics {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  stickinessLabel: string;
  dauTrend: { date: string; count: number }[];
  cohorts: CohortData[];
  churn: {
    rate: number;
    churned: number;
    retained: number;
  };
  lastUpdated: string;
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check admin authentication
    const cookieStore = await safeCookiesAsync();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    let sessionData;
    try {
      sessionData = await decryptSessionData(adminSession.value);

      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }
    } catch (error) {
      logger.error('Admin session decryption failed:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = QueryParamsSchema.parse({
      range: searchParams.get('range') || '30d',
      refresh: searchParams.get('refresh') || undefined,
    });
    const { range } = validatedParams;
    const forceRefresh = validatedParams.refresh === 'true';

    // Wrap retention computation in cache
    const retention = await withCache(
      ADMIN_CACHE_KEYS.retention(range),
      async (): Promise<RetentionMetrics> => {
        const now = new Date();

        // Calculate time ranges
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Determine range for trends
        let startDate: Date;
        switch (range) {
          case '7d':
            startDate = oneWeekAgo;
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default: // 30d
            startDate = oneMonthAgo;
        }

        // Fetch data in parallel
        const [
          dauResult,
          wauResult,
          mauResult,
          allUsersResult,
          featureEventsResult,
        ] = await Promise.allSettled([
          // DAU - users active in last 24 hours
          supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('last_seen', oneDayAgo.toISOString()),

          // WAU - users active in last 7 days
          supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('last_seen', oneWeekAgo.toISOString()),

          // MAU - users active in last 30 days
          supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('last_seen', oneMonthAgo.toISOString()),

          // All users for cohort analysis
          supabaseAdmin
            .from('users')
            .select('id, created_at, last_seen')
            .order('created_at', { ascending: true }),

          // Feature events for daily activity trend
          supabaseAdmin
            .from('feature_events')
            .select('user_id, created_at')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true }),
        ]);

        // Extract results
        const dau = dauResult.status === 'fulfilled' ? (dauResult.value.count || 0) : 0;
        const wau = wauResult.status === 'fulfilled' ? (wauResult.value.count || 0) : 0;
        const mau = mauResult.status === 'fulfilled' ? (mauResult.value.count || 0) : 0;
        const allUsers = allUsersResult.status === 'fulfilled' ? (allUsersResult.value.data || []) : [];
        const featureEvents = featureEventsResult.status === 'fulfilled' ? (featureEventsResult.value.data || []) : [];

        // Calculate stickiness (DAU/MAU ratio)
        const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;
        let stickinessLabel: string;
        if (stickiness >= 20) {
          stickinessLabel = 'Excellent';
        } else if (stickiness >= 10) {
          stickinessLabel = 'Good';
        } else if (stickiness > 0) {
          stickinessLabel = 'Needs improvement';
        } else {
          stickinessLabel = 'No data';
        }

        // Build DAU trend from feature events
        const dailyActiveUsers: Record<string, Set<string>> = {};
        featureEvents.forEach((event: { user_id: string | null; created_at: string }) => {
          if (event.user_id) {
            const dateStr = event.created_at.split('T')[0];
            if (!dailyActiveUsers[dateStr]) {
              dailyActiveUsers[dateStr] = new Set();
            }
            dailyActiveUsers[dateStr].add(event.user_id);
          }
        });

        // Generate daily trend data
        const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dauTrend: { date: string; count: number }[] = [];
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          dauTrend.push({
            date: dateStr,
            count: dailyActiveUsers[dateStr]?.size || 0,
          });
        }

        // Build cohort analysis (weekly cohorts, 4 week retention)
        const cohorts: CohortData[] = [];
        const cohortWeeks = 8; // Analyze last 8 weeks of cohorts

        for (let w = 0; w < cohortWeeks; w++) {
          const cohortStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
          const cohortEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);

          // Users who signed up in this cohort week
          const cohortUsers = allUsers.filter((user: { created_at: string }) => {
            const createdAt = new Date(user.created_at);
            return createdAt >= cohortStart && createdAt < cohortEnd;
          });

          if (cohortUsers.length === 0) continue;

          // Calculate retention for each subsequent week
          const calculateWeekRetention = (weekNum: number) => {
            const weekStart = new Date(cohortEnd.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(cohortEnd.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000);

            // If the week hasn't happened yet, return null
            if (weekStart > now) return -1;

            const activeInWeek = cohortUsers.filter((user: { last_seen: string | null }) => {
              if (!user.last_seen) return false;
              const lastSeen = new Date(user.last_seen);
              return lastSeen >= weekStart && lastSeen <= (weekEnd > now ? now : weekEnd);
            });

            return Math.round((activeInWeek.length / cohortUsers.length) * 100);
          };

          const cohortLabel = cohortStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          cohorts.push({
            cohort: cohortLabel,
            users: cohortUsers.length,
            week1: calculateWeekRetention(1),
            week2: calculateWeekRetention(2),
            week3: calculateWeekRetention(3),
            week4: calculateWeekRetention(4),
          });
        }

        // Calculate churn (users who haven't been active in 30 days but were active before)
        const inactiveThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const activeThreshold = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const totalUsersEver = allUsers.length;
        const churned = allUsers.filter((user: { last_seen: string | null; created_at: string }) => {
          if (!user.last_seen) return false;
          const lastSeen = new Date(user.last_seen);
          const createdAt = new Date(user.created_at);
          // User was active (created before 30 days ago) but hasn't been seen in 30 days
          return createdAt < activeThreshold && lastSeen < inactiveThreshold;
        }).length;

        const retained = totalUsersEver - churned;
        const churnRate = totalUsersEver > 0 ? Math.round((churned / totalUsersEver) * 100) : 0;

        return {
          dau,
          wau,
          mau,
          stickiness,
          stickinessLabel,
          dauTrend,
          cohorts: cohorts.reverse(), // Most recent first
          churn: {
            rate: churnRate,
            churned,
            retained,
          },
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.analytics, skipCache: forceRefresh }
    );

    return NextResponse.json({
      success: true,
      retention,
    });

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/retention',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/retention GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch retention data' },
      { status: 500 }
    );
  }
}
