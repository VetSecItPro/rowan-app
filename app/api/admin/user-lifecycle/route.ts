/**
 * User Lifecycle Analytics API Route
 * GET /api/admin/user-lifecycle - Get user lifecycle stages, space analytics, time-to-value, resurrection rate
 *
 * Provides:
 * - Lifecycle stage classification (new, activated, engaged, power_user, at_risk, churned)
 * - Space/household analytics (member distribution, most active spaces)
 * - Time-to-value metrics (median and average hours to first meaningful action)
 * - Resurrection rate (users returning after 30+ day inactivity)
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

interface LifecycleStages {
  new: number;
  activated: number;
  engaged: number;
  power_user: number;
  at_risk: number;
  churned: number;
}

interface SpaceAnalytics {
  avgMembersPerSpace: number;
  distribution: {
    singleUser: number;
    twoToThree: number;
    fourPlus: number;
  };
  mostActiveSpaces: {
    spaceId: string;
    name: string;
    memberCount: number;
    eventCount: number;
  }[];
  totalSpaces: number;
}

interface TimeToValue {
  medianHours: number;
  averageHours: number;
}

interface ResurrectionMetrics {
  resurrectedUsers: number;
  totalChurned: number;
  resurrectionRate: number;
}

interface LifecycleData {
  stages: LifecycleStages;
  total: number;
  spaceAnalytics: SpaceAnalytics;
  timeToValue: TimeToValue;
  resurrection: ResurrectionMetrics;
  lastUpdated: string;
}

/**
 * Fetch all users from auth.admin.listUsers with pagination
 */
async function fetchAllAuthUsers(): Promise<{ id: string; email?: string; created_at: string }[]> {
  const allUsers: { id: string; email?: string; created_at: string }[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      logger.error('Failed to fetch auth users page:', error, { component: 'api-route', action: 'api_request' });
      break;
    }

    if (!data.users || data.users.length === 0) break;

    allUsers.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      }))
    );

    // If we got fewer than perPage, we've reached the last page
    if (data.users.length < perPage) break;
    page++;
  }

  return allUsers;
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

    // Admin auth
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Wrap lifecycle computation in cache
    const lifecycle = await withCache<LifecycleData>(
      ADMIN_CACHE_KEYS.userLifecycle,
      async (): Promise<LifecycleData> => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const _fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Fetch all auth users
        const authUsers = await fetchAllAuthUsers();
        const totalUsers = authUsers.length;
        const userIds = authUsers.map((u) => u.id);
        const userCreatedMap = new Map(authUsers.map((u) => [u.id, new Date(u.created_at)]));

        // Parallel data fetching
        const [
          spaceMembersResult,
          allFeatureEventsResult,
          recentFeatureEventsResult,
          spacesResult,
          spaceMemberCountsResult,
          spaceEventsResult,
        ] = await Promise.allSettled([
          // All space memberships
          supabaseAdmin
            .from('space_members')
            .select('user_id, space_id')
            .in('user_id', userIds.length > 0 ? userIds : ['__none__'])
            .limit(50000),

          // All feature events (for time-to-value and resurrection)
          supabaseAdmin
            .from('feature_events')
            .select('user_id, action, created_at')
            .in('user_id', userIds.length > 0 ? userIds : ['__none__'])
            .order('created_at', { ascending: true })
            .limit(100000),

          // Feature events in last 30 days (for lifecycle classification)
          supabaseAdmin
            .from('feature_events')
            .select('user_id, action, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .in('user_id', userIds.length > 0 ? userIds : ['__none__'])
            .limit(100000),

          // All spaces with names
          supabaseAdmin
            .from('spaces')
            .select('id, name')
            .limit(10000),

          // Space member counts (for distribution)
          supabaseAdmin
            .from('space_members')
            .select('space_id')
            .limit(50000),

          // Feature events per space in last 30 days (for most active spaces)
          supabaseAdmin
            .from('feature_events')
            .select('space_id, user_id')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .not('space_id', 'is', null)
            .limit(100000),
        ]);

        // Extract results safely
        const spaceMembers = spaceMembersResult.status === 'fulfilled'
          ? (spaceMembersResult.value.data || [])
          : [];
        const allFeatureEvents = allFeatureEventsResult.status === 'fulfilled'
          ? (allFeatureEventsResult.value.data || [])
          : [];
        const recentFeatureEvents = recentFeatureEventsResult.status === 'fulfilled'
          ? (recentFeatureEventsResult.value.data || [])
          : [];
        const spaces = spacesResult.status === 'fulfilled'
          ? (spacesResult.value.data || [])
          : [];
        const allSpaceMembers = spaceMemberCountsResult.status === 'fulfilled'
          ? (spaceMemberCountsResult.value.data || [])
          : [];
        const spaceEvents = spaceEventsResult.status === 'fulfilled'
          ? (spaceEventsResult.value.data || [])
          : [];

        // ─── LIFECYCLE STAGES ───────────────────────────────────────────

        // Build lookup sets
        const usersWithSpaces = new Set(
          spaceMembers.map((m: { user_id: string }) => m.user_id)
        );

        // Non-page_view events per user from all events
        const usersWithMeaningfulAction = new Set(
          allFeatureEvents
            .filter((e: { action: string }) => e.action !== 'page_view')
            .map((e: { user_id: string }) => e.user_id)
        );

        // Recent events (last 7 days) per user
        const recentSevenDayEvents = recentFeatureEvents.filter(
          (e: { created_at: string }) => new Date(e.created_at) >= sevenDaysAgo
        );

        const usersActiveLastSevenDays = new Set(
          recentSevenDayEvents.map((e: { user_id: string }) => e.user_id)
        );

        // Distinct active days per user in last 7 days
        const userActiveDays = new Map<string, Set<string>>();
        recentSevenDayEvents.forEach((e: { user_id: string; created_at: string }) => {
          const dateStr = e.created_at.split('T')[0];
          if (!userActiveDays.has(e.user_id)) {
            userActiveDays.set(e.user_id, new Set());
          }
          userActiveDays.get(e.user_id)!.add(dateStr);
        });

        // Last feature event per user (from all events)
        const userLastEvent = new Map<string, Date>();
        allFeatureEvents.forEach((e: { user_id: string; created_at: string }) => {
          const eventDate = new Date(e.created_at);
          const current = userLastEvent.get(e.user_id);
          if (!current || eventDate > current) {
            userLastEvent.set(e.user_id, eventDate);
          }
        });

        // Classify each user
        const stages: LifecycleStages = {
          new: 0,
          activated: 0,
          engaged: 0,
          power_user: 0,
          at_risk: 0,
          churned: 0,
        };

        authUsers.forEach((user) => {
          const createdAt = userCreatedMap.get(user.id)!;
          const daysSinceSignup = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          const lastEvent = userLastEvent.get(user.id);
          const daysSinceLastEvent = lastEvent
            ? (now.getTime() - lastEvent.getTime()) / (1000 * 60 * 60 * 24)
            : Infinity;
          const activeDaysCount = userActiveDays.get(user.id)?.size || 0;

          // Classification priority: new > power_user > engaged > activated > at_risk > churned
          if (daysSinceSignup < 7) {
            stages.new++;
          } else if (activeDaysCount >= 5) {
            stages.power_user++;
          } else if (usersActiveLastSevenDays.has(user.id)) {
            stages.engaged++;
          } else if (usersWithSpaces.has(user.id) && usersWithMeaningfulAction.has(user.id)) {
            // Has space + meaningful action, but not recently active
            if (daysSinceLastEvent >= 30 && daysSinceSignup > 30) {
              stages.churned++;
            } else if (daysSinceLastEvent >= 14 && daysSinceSignup > 14) {
              stages.at_risk++;
            } else {
              stages.activated++;
            }
          } else if (daysSinceLastEvent >= 30 && daysSinceSignup > 30) {
            stages.churned++;
          } else if (daysSinceLastEvent >= 14 && daysSinceSignup > 14) {
            stages.at_risk++;
          } else {
            // Not yet activated (no space or no meaningful action), but not old enough to be at_risk/churned
            stages.activated++;
          }
        });

        // ─── SPACE / HOUSEHOLD ANALYTICS ────────────────────────────────

        // Count members per space
        const spaceMemberCounts = new Map<string, number>();
        allSpaceMembers.forEach((m: { space_id: string }) => {
          spaceMemberCounts.set(m.space_id, (spaceMemberCounts.get(m.space_id) || 0) + 1);
        });

        const spaceNameMap = new Map(
          spaces.map((s: { id: string; name: string }) => [s.id, s.name])
        );

        const totalSpaces = spaces.length;
        const memberCounts = Array.from(spaceMemberCounts.values());
        const avgMembersPerSpace = memberCounts.length > 0
          ? Math.round((memberCounts.reduce((a, b) => a + b, 0) / memberCounts.length) * 10) / 10
          : 0;

        const distribution = { singleUser: 0, twoToThree: 0, fourPlus: 0 };
        memberCounts.forEach((count) => {
          if (count === 1) distribution.singleUser++;
          else if (count <= 3) distribution.twoToThree++;
          else distribution.fourPlus++;
        });

        // Most active spaces by event count in last 30 days
        const spaceEventCounts = new Map<string, number>();
        spaceEvents.forEach((e: { space_id: string }) => {
          spaceEventCounts.set(e.space_id, (spaceEventCounts.get(e.space_id) || 0) + 1);
        });

        const mostActiveSpaces = Array.from(spaceEventCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([spaceId, eventCount]) => ({
            spaceId,
            name: spaceNameMap.get(spaceId) || 'Unknown',
            memberCount: spaceMemberCounts.get(spaceId) || 0,
            eventCount,
          }));

        const spaceAnalytics: SpaceAnalytics = {
          avgMembersPerSpace,
          distribution,
          mostActiveSpaces,
          totalSpaces,
        };

        // ─── TIME-TO-VALUE ──────────────────────────────────────────────

        // For each user, find first non-page_view event and calculate hours from signup
        const userFirstMeaningfulEvent = new Map<string, Date>();
        allFeatureEvents.forEach((e: { user_id: string; action: string; created_at: string }) => {
          if (e.action === 'page_view') return;
          if (!userFirstMeaningfulEvent.has(e.user_id)) {
            userFirstMeaningfulEvent.set(e.user_id, new Date(e.created_at));
          }
        });

        const timeToValueHours: number[] = [];
        authUsers.forEach((user) => {
          const firstEvent = userFirstMeaningfulEvent.get(user.id);
          if (!firstEvent) return;
          const signupDate = userCreatedMap.get(user.id)!;
          const diffHours = (firstEvent.getTime() - signupDate.getTime()) / (1000 * 60 * 60);
          // Only count positive values (event after signup)
          if (diffHours >= 0) {
            timeToValueHours.push(diffHours);
          }
        });

        let medianHours = 0;
        let averageHours = 0;

        if (timeToValueHours.length > 0) {
          // Sort for median
          timeToValueHours.sort((a, b) => a - b);
          const mid = Math.floor(timeToValueHours.length / 2);
          medianHours = timeToValueHours.length % 2 === 0
            ? Math.round(((timeToValueHours[mid - 1] + timeToValueHours[mid]) / 2) * 10) / 10
            : Math.round(timeToValueHours[mid] * 10) / 10;
          averageHours = Math.round(
            (timeToValueHours.reduce((a, b) => a + b, 0) / timeToValueHours.length) * 10
          ) / 10;
        }

        const timeToValue: TimeToValue = { medianHours, averageHours };

        // ─── RESURRECTION RATE ──────────────────────────────────────────

        // Build per-user sorted event timeline
        const userEventTimeline = new Map<string, Date[]>();
        allFeatureEvents.forEach((e: { user_id: string; created_at: string }) => {
          if (!userEventTimeline.has(e.user_id)) {
            userEventTimeline.set(e.user_id, []);
          }
          userEventTimeline.get(e.user_id)!.push(new Date(e.created_at));
        });

        let totalChurnedEver = 0;
        let resurrectedUsers = 0;

        userEventTimeline.forEach((events, _userId) => {
          if (events.length < 2) return;

          // Sort events chronologically
          events.sort((a, b) => a.getTime() - b.getTime());

          let hadChurnGap = false;
          let returnedAfterGap = false;

          for (let i = 1; i < events.length; i++) {
            const gapDays = (events[i].getTime() - events[i - 1].getTime()) / (1000 * 60 * 60 * 24);
            if (gapDays >= 30) {
              hadChurnGap = true;
              // Check if there are events after this gap
              if (i < events.length) {
                returnedAfterGap = true;
              }
            }
          }

          if (hadChurnGap) {
            totalChurnedEver++;
            if (returnedAfterGap) {
              resurrectedUsers++;
            }
          }
        });

        // Also count users who are currently churned (no events in 30+ days, signup > 30 days ago)
        authUsers.forEach((user) => {
          const lastEvent = userLastEvent.get(user.id);
          const createdAt = userCreatedMap.get(user.id)!;
          const daysSinceSignup = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceSignup > 30) {
            if (!lastEvent) {
              // Never had any event — count as churned
              totalChurnedEver++;
            } else {
              const daysSinceLastEvent = (now.getTime() - lastEvent.getTime()) / (1000 * 60 * 60 * 24);
              // Currently churned but no gap detected in timeline (only had events, then stopped)
              if (daysSinceLastEvent >= 30 && !userEventTimeline.has(user.id)) {
                totalChurnedEver++;
              }
            }
          }
        });

        const resurrectionRate = totalChurnedEver > 0
          ? Math.round((resurrectedUsers / totalChurnedEver) * 1000) / 10
          : 0;

        const resurrection: ResurrectionMetrics = {
          resurrectedUsers,
          totalChurned: totalChurnedEver,
          resurrectionRate,
        };

        return {
          stages,
          total: totalUsers,
          spaceAnalytics,
          timeToValue,
          resurrection,
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.userLifecycle }
    );

    return NextResponse.json({
      success: true,
      lifecycle,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/user-lifecycle',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/user-lifecycle GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch user lifecycle data' },
      { status: 500 }
    );
  }
}
