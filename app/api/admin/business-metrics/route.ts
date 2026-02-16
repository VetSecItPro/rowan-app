/**
 * Business Metrics API Route
 * GET /api/admin/business-metrics - Acquisition-critical business metrics
 *
 * Provides:
 * - MRR Waterfall (last 6 months)
 * - Net Revenue Retention (NRR)
 * - LTV:CAC Ratio
 * - Projected Revenue (12-month forward)
 * - Revenue by Signup Cohort
 * - Business Scorecard (MRR, growth, churn, DAU/MAU, NRR, activation)
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

// ---------------------------------------------------------------------------
// Pricing constants (monthly effective rate)
// ---------------------------------------------------------------------------
const TIER_PRICES = {
  pro: { monthly: 18, annual: 16 },
  family: { monthly: 29, annual: 27 },
  free: { monthly: 0, annual: 0 },
} as const;

/**
 * Calculate the effective monthly revenue for a subscription.
 */
function getUserMrr(tier: string, period: string): number {
  const prices = TIER_PRICES[tier as keyof typeof TIER_PRICES] || TIER_PRICES.free;
  return period === 'annual' ? prices.annual : prices.monthly;
}

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface WaterfallMonth {
  month: string;
  startingMrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  endingMrr: number;
}

interface ProjectedMonth {
  month: string;
  projectedMrr: number;
}

interface CohortRevenue {
  cohortMonth: string;
  userCount: number;
  currentMrr: number;
}

interface Scorecard {
  mrr: number;
  mrrGrowthRate: number;
  churnRate: number;
  dauMauRatio: number;
  nrr: number;
  activationRate: number;
}

interface BusinessMetricsPayload {
  scorecard: Scorecard;
  waterfall: WaterfallMonth[];
  nrr: number;
  ltv: number;
  ltvCacRatio: number;
  projectedRevenue: ProjectedMonth[];
  revenueByCohort: CohortRevenue[];
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Helper: format a Date as "YYYY-MM"
// ---------------------------------------------------------------------------
function toMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    // ---- Rate limiting ----
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // ---- Admin auth ----
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // ---- Check for cache bypass ----
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // ---- Compute (with cache) ----
    const metrics = await withCache<BusinessMetricsPayload>(
      ADMIN_CACHE_KEYS.businessMetrics,
      () => computeBusinessMetrics(),
      { ttl: ADMIN_CACHE_TTL.businessMetrics, skipCache: forceRefresh }
    );

    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/business-metrics', method: 'GET' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/admin/business-metrics GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Failed to fetch business metrics' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

async function computeBusinessMetrics(): Promise<BusinessMetricsPayload> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const _ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  // 6 months back for waterfall
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  // -----------------------------------------------------------------------
  // Parallel data fetches
  // -----------------------------------------------------------------------
  const [
    activeSubsResult,
    subEventsResult,
    dauResult,
    mauResult,
    totalUsersResult,
    activatedUsersResult,
    authUsersResult,
  ] = await Promise.allSettled([
    // 1. All active subscriptions (for current MRR, cohort revenue, NRR)
    supabaseAdmin
      .from('subscriptions')
      .select('user_id, tier, period, status, subscription_started_at, created_at')
      .eq('status', 'active'),

    // 2. Subscription events in last 6 months (for waterfall)
    supabaseAdmin
      .from('subscription_events')
      .select('user_id, event_type, from_tier, to_tier, metadata, created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true }),

    // 3. DAU (distinct users with feature_events in last 24h)
    supabaseAdmin
      .from('feature_events')
      .select('user_id')
      .gte('created_at', oneDayAgo.toISOString()),

    // 4. MAU (distinct users with feature_events in last 30 days)
    supabaseAdmin
      .from('feature_events')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString()),

    // 5. Total users count
    supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true }),

    // 6. Activated users (users who have a space AND at least 1 feature event)
    supabaseAdmin.rpc('get_activated_user_count').maybeSingle(),

    // 7. Auth users with created_at (for cohort analysis — via subscriptions join)
    //    We query subscriptions + auth user creation from the subscriptions side
    //    since supabaseAdmin can access auth.users via joins
    supabaseAdmin
      .from('subscriptions')
      .select('user_id, tier, period, status, created_at')
      .eq('status', 'active'),
  ]);

  // -----------------------------------------------------------------------
  // Extract results with safe defaults
  // -----------------------------------------------------------------------
  const activeSubs = activeSubsResult.status === 'fulfilled'
    ? (activeSubsResult.value.data || [])
    : [];

  const subEvents = subEventsResult.status === 'fulfilled'
    ? (subEventsResult.value.data || [])
    : [];

  // DAU — count distinct user_ids
  const dauEvents = dauResult.status === 'fulfilled'
    ? (dauResult.value.data || [])
    : [];
  const dauUserIds = new Set(
    dauEvents
      .map((e: { user_id: string | null }) => e.user_id)
      .filter(Boolean)
  );
  const dau = dauUserIds.size;

  // MAU — count distinct user_ids
  const mauEvents = mauResult.status === 'fulfilled'
    ? (mauResult.value.data || [])
    : [];
  const mauUserIds = new Set(
    mauEvents
      .map((e: { user_id: string | null }) => e.user_id)
      .filter(Boolean)
  );
  const mau = mauUserIds.size;

  const totalUsers = totalUsersResult.status === 'fulfilled'
    ? (totalUsersResult.value.count || 0)
    : 0;

  // -----------------------------------------------------------------------
  // 1. Current MRR
  // -----------------------------------------------------------------------
  let currentMrr = 0;
  for (const sub of activeSubs) {
    currentMrr += getUserMrr(sub.tier, sub.period);
  }

  // -----------------------------------------------------------------------
  // 2. MRR Waterfall (last 6 months)
  // -----------------------------------------------------------------------
  const waterfall = buildWaterfall(subEvents, activeSubs, now, sixMonthsAgo);

  // -----------------------------------------------------------------------
  // 3. NRR (Net Revenue Retention)
  //    Users who were paying subscribers 30 days ago: compare their MRR then
  //    vs their MRR now.
  // -----------------------------------------------------------------------
  const nrr = computeNrr(activeSubs, subEvents, thirtyDaysAgo);

  // -----------------------------------------------------------------------
  // 4. Churn rate (monthly)
  //    Cancellations in the last 30 days / active subs at start of period
  // -----------------------------------------------------------------------
  const cancelEventsLast30 = subEvents.filter(
    (e: { event_type: string; created_at: string }) =>
      e.event_type === 'cancel' &&
      new Date(e.created_at) >= thirtyDaysAgo
  );
  const subsAtPeriodStart = activeSubs.length + cancelEventsLast30.length;
  const churnRate = subsAtPeriodStart > 0
    ? Number(((cancelEventsLast30.length / subsAtPeriodStart) * 100).toFixed(2))
    : 0;

  // -----------------------------------------------------------------------
  // 5. LTV & LTV:CAC
  // -----------------------------------------------------------------------
  const arpu = activeSubs.length > 0 ? currentMrr / activeSubs.length : 0;
  const monthlyChurnDecimal = churnRate / 100;
  const ltv = monthlyChurnDecimal > 0
    ? Number((arpu * (1 / monthlyChurnDecimal)).toFixed(2))
    : arpu > 0 ? arpu * 60 : 0; // If no churn, assume 5-year max lifetime
  const cac = 0; // Organic-only for now
  const ltvCacRatio = cac > 0 ? Number((ltv / cac).toFixed(2)) : ltv > 0 ? Infinity : 0;

  // -----------------------------------------------------------------------
  // 6. DAU/MAU Ratio
  // -----------------------------------------------------------------------
  const dauMauRatio = mau > 0 ? Number(((dau / mau) * 100).toFixed(1)) : 0;

  // -----------------------------------------------------------------------
  // 7. Activation Rate
  //    Users with a space AND at least 1 feature_event / total users
  // -----------------------------------------------------------------------
  let activatedCount = 0;

  if (activatedUsersResult.status === 'fulfilled' && activatedUsersResult.value.data) {
    // If the RPC exists and returns data
    const rpcData = activatedUsersResult.value.data as { count?: number } | null;
    activatedCount = rpcData?.count || 0;
  } else {
    // Fallback: query manually
    activatedCount = await getActivatedUserCountFallback();
  }

  const activationRate = totalUsers > 0
    ? Number(((activatedCount / totalUsers) * 100).toFixed(1))
    : 0;

  // -----------------------------------------------------------------------
  // 8. MRR Growth Rate (last 3 months)
  // -----------------------------------------------------------------------
  const mrrGrowthRate = computeMrrGrowthRate(waterfall);

  // -----------------------------------------------------------------------
  // 9. Projected Revenue (next 12 months)
  // -----------------------------------------------------------------------
  const projectedRevenue = projectRevenue(currentMrr, mrrGrowthRate, now);

  // -----------------------------------------------------------------------
  // 10. Revenue by Cohort
  // -----------------------------------------------------------------------
  const authSubsData = authUsersResult.status === 'fulfilled'
    ? (authUsersResult.value.data || [])
    : activeSubs;
  const revenueByCohort = buildRevenueByCohort(authSubsData);

  // -----------------------------------------------------------------------
  // Assemble scorecard
  // -----------------------------------------------------------------------
  const scorecard: Scorecard = {
    mrr: Number(currentMrr.toFixed(2)),
    mrrGrowthRate,
    churnRate,
    dauMauRatio,
    nrr,
    activationRate,
  };

  return {
    scorecard,
    waterfall,
    nrr,
    ltv,
    ltvCacRatio: ltvCacRatio === Infinity ? -1 : ltvCacRatio, // JSON-safe
    projectedRevenue,
    revenueByCohort,
    lastUpdated: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Waterfall builder
// ---------------------------------------------------------------------------

function buildWaterfall(
  events: Array<{
    event_type: string;
    from_tier: string | null;
    to_tier: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>,
  activeSubs: Array<{ tier: string; period: string }>,
  now: Date,
  sixMonthsAgo: Date,
): WaterfallMonth[] {
  // Group events by month
  const eventsByMonth: Record<string, typeof events> = {};
  for (const evt of events) {
    const key = toMonthKey(new Date(evt.created_at));
    if (!eventsByMonth[key]) eventsByMonth[key] = [];
    eventsByMonth[key].push(evt);
  }

  // Generate 6-month range
  const months: string[] = [];
  const cursor = new Date(sixMonthsAgo);
  while (cursor <= now) {
    months.push(toMonthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const waterfall: WaterfallMonth[] = [];
  let runningMrr = 0; // We will build forward

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    const monthEvents = eventsByMonth[month] || [];

    let newMrr = 0;
    let expansionMrr = 0;
    let contractionMrr = 0;
    let churnedMrr = 0;

    for (const evt of monthEvents) {
      const fromTier = evt.from_tier || 'free';
      const toTier = evt.to_tier || 'free';
      // Use monthly as default period for event MRR estimation
      const metaPeriod = (evt.metadata as Record<string, unknown> | null)?.period as string | undefined;
      const period = metaPeriod || 'monthly';

      switch (evt.event_type) {
        case 'upgrade': {
          if (fromTier === 'free') {
            // New paying customer
            newMrr += getUserMrr(toTier, period);
          } else {
            // Expansion: upgrade from one paid tier to higher
            const oldMrr = getUserMrr(fromTier, period);
            const newTierMrr = getUserMrr(toTier, period);
            expansionMrr += Math.max(0, newTierMrr - oldMrr);
          }
          break;
        }
        case 'downgrade': {
          const oldMrr = getUserMrr(fromTier, period);
          const newTierMrr = getUserMrr(toTier, period);
          contractionMrr += Math.max(0, oldMrr - newTierMrr);
          break;
        }
        case 'cancel': {
          churnedMrr += getUserMrr(fromTier, period);
          break;
        }
        // 'reactivate' treated as new MRR
        case 'reactivate': {
          newMrr += getUserMrr(toTier || 'pro', period);
          break;
        }
      }
    }

    const startingMrr = runningMrr;
    const endingMrr = startingMrr + newMrr + expansionMrr - contractionMrr - churnedMrr;
    runningMrr = Math.max(0, endingMrr);

    waterfall.push({
      month,
      startingMrr: Number(startingMrr.toFixed(2)),
      newMrr: Number(newMrr.toFixed(2)),
      expansionMrr: Number(expansionMrr.toFixed(2)),
      contractionMrr: Number(contractionMrr.toFixed(2)),
      churnedMrr: Number(churnedMrr.toFixed(2)),
      endingMrr: Number(runningMrr.toFixed(2)),
    });
  }

  return waterfall;
}

// ---------------------------------------------------------------------------
// NRR computation
// ---------------------------------------------------------------------------

function computeNrr(
  activeSubs: Array<{ user_id: string; tier: string; period: string; subscription_started_at: string | null; created_at: string }>,
  events: Array<{ user_id: string; event_type: string; from_tier: string | null; to_tier: string | null; created_at: string; metadata: Record<string, unknown> | null }>,
  thirtyDaysAgo: Date,
): number {
  // Identify users who were paying subscribers 30+ days ago
  const existingPayingUsers = activeSubs.filter((sub) => {
    const startDate = sub.subscription_started_at
      ? new Date(sub.subscription_started_at)
      : new Date(sub.created_at);
    return startDate <= thirtyDaysAgo && sub.tier !== 'free';
  });

  if (existingPayingUsers.length === 0) return 100;

  // Their MRR 30 days ago — approximate from current tier, adjusted for events
  const existingUserIds = new Set(existingPayingUsers.map((s) => s.user_id));

  // Starting MRR: sum of their current MRR (we'll adjust for changes)
  let startingMrr = 0;
  let currentMrrFromExisting = 0;

  for (const sub of existingPayingUsers) {
    const currentUserMrr = getUserMrr(sub.tier, sub.period);
    currentMrrFromExisting += currentUserMrr;

    // Look for events in the last 30 days for this user to estimate their starting MRR
    const userEvents = events.filter(
      (e) => e.user_id === sub.user_id && new Date(e.created_at) >= thirtyDaysAgo
    );

    if (userEvents.length === 0) {
      // No changes, so starting MRR = current MRR
      startingMrr += currentUserMrr;
    } else {
      // Walk back from the first event's from_tier
      const firstEvent = userEvents[0];
      const fromTier = firstEvent.from_tier || sub.tier;
      const metaPeriod = (firstEvent.metadata as Record<string, unknown> | null)?.period as string | undefined;
      startingMrr += getUserMrr(fromTier, metaPeriod || sub.period);
    }
  }

  // Also account for churned users who were in our existing set
  const cancelledFromExisting = events.filter(
    (e) =>
      e.event_type === 'cancel' &&
      existingUserIds.has(e.user_id) &&
      new Date(e.created_at) >= thirtyDaysAgo
  );

  for (const evt of cancelledFromExisting) {
    const metaPeriod = (evt.metadata as Record<string, unknown> | null)?.period as string | undefined;
    const fromTier = evt.from_tier || 'pro';
    // They are no longer paying, so remove from currentMrrFromExisting
    // but they were counted in startingMrr
    currentMrrFromExisting -= getUserMrr(fromTier, metaPeriod || 'monthly');
    // Ensure we don't double-count if they're not in activeSubs anymore
  }

  // NRR = current MRR from existing cohort / starting MRR * 100
  if (startingMrr === 0) return 100;
  return Number(((Math.max(0, currentMrrFromExisting) / startingMrr) * 100).toFixed(1));
}

// ---------------------------------------------------------------------------
// MRR growth rate (average monthly growth over last 3 months in waterfall)
// ---------------------------------------------------------------------------

function computeMrrGrowthRate(waterfall: WaterfallMonth[]): number {
  if (waterfall.length < 2) return 0;

  // Take the last 3 months (or as many as available)
  const recentMonths = waterfall.slice(-3);
  const growthRates: number[] = [];

  for (let i = 1; i < recentMonths.length; i++) {
    const prev = recentMonths[i - 1].endingMrr;
    const curr = recentMonths[i].endingMrr;
    if (prev > 0) {
      growthRates.push(((curr - prev) / prev) * 100);
    }
  }

  if (growthRates.length === 0) return 0;
  const avgGrowth = growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length;
  return Number(avgGrowth.toFixed(2));
}

// ---------------------------------------------------------------------------
// Revenue projection (12 months forward using compound growth)
// ---------------------------------------------------------------------------

function projectRevenue(currentMrr: number, monthlyGrowthPct: number, now: Date): ProjectedMonth[] {
  const projected: ProjectedMonth[] = [];
  const growthMultiplier = 1 + monthlyGrowthPct / 100;
  let mrr = currentMrr;

  for (let i = 1; i <= 12; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    mrr = Number((mrr * growthMultiplier).toFixed(2));
    projected.push({
      month: toMonthKey(futureDate),
      projectedMrr: Math.max(0, mrr),
    });
  }

  return projected;
}

// ---------------------------------------------------------------------------
// Revenue by signup cohort
// ---------------------------------------------------------------------------

function buildRevenueByCohort(
  subs: Array<{ user_id: string; tier: string; period: string; status: string; created_at: string }>,
): CohortRevenue[] {
  const cohortMap: Record<string, { users: Set<string>; mrr: number }> = {};

  for (const sub of subs) {
    if (sub.status !== 'active' || sub.tier === 'free') continue;

    const cohortMonth = toMonthKey(new Date(sub.created_at));
    if (!cohortMap[cohortMonth]) {
      cohortMap[cohortMonth] = { users: new Set(), mrr: 0 };
    }
    cohortMap[cohortMonth].users.add(sub.user_id);
    cohortMap[cohortMonth].mrr += getUserMrr(sub.tier, sub.period);
  }

  return Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortMonth, data]) => ({
      cohortMonth,
      userCount: data.users.size,
      currentMrr: Number(data.mrr.toFixed(2)),
    }));
}

// ---------------------------------------------------------------------------
// Activation rate fallback (when RPC doesn't exist)
// ---------------------------------------------------------------------------

async function getActivatedUserCountFallback(): Promise<number> {
  try {
    // Users who belong to at least one space
    const { data: spaceMembers } = await supabaseAdmin
      .from('space_members')
      .select('user_id');

    if (!spaceMembers || spaceMembers.length === 0) return 0;

    const usersWithSpaces = new Set(
      spaceMembers.map((m: { user_id: string }) => m.user_id)
    );

    // Users who have at least 1 feature event
    const { data: featureUsers } = await supabaseAdmin
      .from('feature_events')
      .select('user_id');

    if (!featureUsers || featureUsers.length === 0) return 0;

    const usersWithEvents = new Set(
      featureUsers
        .map((e: { user_id: string | null }) => e.user_id)
        .filter(Boolean)
    );

    // Intersection: users with both a space and at least 1 feature event
    let count = 0;
    usersWithSpaces.forEach((uid) => {
      if (usersWithEvents.has(uid)) count++;
    });

    return count;
  } catch (error) {
    logger.warn('Activation rate fallback query failed:', {
      component: 'api-route',
      error,
    });
    return 0;
  }
}
