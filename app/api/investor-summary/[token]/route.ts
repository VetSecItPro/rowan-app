/**
 * Public Investor Summary API Route
 * GET /api/investor-summary/[token] - Get sanitized business metrics
 *
 * NO AUTH REQUIRED - Token IS the auth
 * Rate limited by IP
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    token: string;
  }>;
}

/**
 * GET /api/investor-summary/[token]
 * Validate token and return sanitized business metrics
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // Rate limiting by IP
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Get token from params
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('investor_summary_tokens')
      .select('id, expires_at, is_revoked, access_count')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      logger.warn('Invalid investor summary token attempt', {
        component: 'api-route',
        action: 'invalid_token',
        ip,
      });
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if token is revoked
    if (tokenData.is_revoked) {
      return NextResponse.json(
        { error: 'This link has been revoked' },
        { status: 401 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 401 }
      );
    }

    // Increment access count and update last_accessed
    await supabaseAdmin
      .from('investor_summary_tokens')
      .update({
        access_count: (tokenData.access_count || 0) + 1,
        last_accessed: now.toISOString(),
      })
      .eq('id', tokenData.id);

    // Fetch business metrics
    const metrics = await fetchBusinessMetrics();

    return NextResponse.json({
      success: true,
      metrics,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/investor-summary/[token]', method: 'GET' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/investor-summary/[token] GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Fetch sanitized business metrics for investor view
 * Returns only high-level metrics without sensitive details
 */
async function fetchBusinessMetrics() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Tier prices (monthly effective rate)
  const TIER_PRICES = {
    pro: { monthly: 18, annual: 16 },
    family: { monthly: 29, annual: 27 },
    free: { monthly: 0, annual: 0 },
  } as const;

  const getUserMrr = (tier: string, period: string): number => {
    const prices = TIER_PRICES[tier as keyof typeof TIER_PRICES] || TIER_PRICES.free;
    return period === 'annual' ? prices.annual : prices.monthly;
  };

  // Fetch data in parallel
  const [
    activeSubsResult,
    subEventsResult,
    totalUsersResult,
    dauResult,
    mauResult,
    userGrowthResult,
  ] = await Promise.allSettled([
    // Active subscriptions
    supabaseAdmin
      .from('subscriptions')
      .select('user_id, tier, period, status, subscription_started_at, created_at')
      .eq('status', 'active'),

    // Subscription events (last 90 days for churn calculation)
    supabaseAdmin
      .from('subscription_events')
      .select('user_id, event_type, from_tier, to_tier, metadata, created_at')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),

    // Total users
    supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true }),

    // DAU
    supabaseAdmin
      .from('feature_events')
      .select('user_id')
      .gte('created_at', oneDayAgo.toISOString()),

    // MAU
    supabaseAdmin
      .from('feature_events')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString()),

    // User growth (last 90 days)
    supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
  ]);

  // Extract results
  const activeSubs = activeSubsResult.status === 'fulfilled'
    ? (activeSubsResult.value.data || [])
    : [];

  const subEvents = subEventsResult.status === 'fulfilled'
    ? (subEventsResult.value.data || [])
    : [];

  const totalUsers = totalUsersResult.status === 'fulfilled'
    ? (totalUsersResult.value.count || 0)
    : 0;

  const dauEvents = dauResult.status === 'fulfilled'
    ? (dauResult.value.data || [])
    : [];

  const mauEvents = mauResult.status === 'fulfilled'
    ? (mauResult.value.data || [])
    : [];

  const userGrowth = userGrowthResult.status === 'fulfilled'
    ? (userGrowthResult.value.data || [])
    : [];

  // Calculate MRR
  let currentMrr = 0;
  for (const sub of activeSubs) {
    currentMrr += getUserMrr(sub.tier, sub.period);
  }

  // Calculate MRR growth (compare last 30 days vs previous 30 days)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const eventsLast30 = subEvents.filter(
    (e: { created_at: string }) => new Date(e.created_at) >= thirtyDaysAgo
  );
  const eventsPrev30 = subEvents.filter(
    (e: { created_at: string }) => {
      const date = new Date(e.created_at);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    }
  );

  let mrrChange = 0;
  for (const evt of eventsLast30) {
    if (evt.event_type === 'upgrade' || evt.event_type === 'reactivate') {
      const period = (evt.metadata as Record<string, unknown> | null)?.period as string || 'monthly';
      mrrChange += getUserMrr(evt.to_tier || 'pro', period);
    } else if (evt.event_type === 'cancel') {
      const period = (evt.metadata as Record<string, unknown> | null)?.period as string || 'monthly';
      mrrChange -= getUserMrr(evt.from_tier || 'pro', period);
    }
  }

  let prevMrrChange = 0;
  for (const evt of eventsPrev30) {
    if (evt.event_type === 'upgrade' || evt.event_type === 'reactivate') {
      const period = (evt.metadata as Record<string, unknown> | null)?.period as string || 'monthly';
      prevMrrChange += getUserMrr(evt.to_tier || 'pro', period);
    } else if (evt.event_type === 'cancel') {
      const period = (evt.metadata as Record<string, unknown> | null)?.period as string || 'monthly';
      prevMrrChange -= getUserMrr(evt.from_tier || 'pro', period);
    }
  }

  const mrrGrowthPct = prevMrrChange !== 0
    ? Number(((mrrChange / Math.abs(prevMrrChange)) * 100).toFixed(1))
    : 0;

  // Calculate churn rate (last 30 days)
  const cancelEventsLast30 = subEvents.filter(
    (e: { event_type: string; created_at: string }) =>
      e.event_type === 'cancel' && new Date(e.created_at) >= thirtyDaysAgo
  );
  const subsAtPeriodStart = activeSubs.length + cancelEventsLast30.length;
  const churnRate = subsAtPeriodStart > 0
    ? Number(((cancelEventsLast30.length / subsAtPeriodStart) * 100).toFixed(2))
    : 0;

  // Calculate DAU/MAU ratio
  const dauUserIds = new Set(
    dauEvents
      .map((e: { user_id: string | null }) => e.user_id)
      .filter(Boolean)
  );
  const mauUserIds = new Set(
    mauEvents
      .map((e: { user_id: string | null }) => e.user_id)
      .filter(Boolean)
  );
  const dau = dauUserIds.size;
  const mau = mauUserIds.size;
  const dauMauRatio = mau > 0 ? Number(((dau / mau) * 100).toFixed(1)) : 0;

  // Calculate NRR (simplified - same cohort MRR comparison)
  const existingPayingUsers = activeSubs.filter((sub: { subscription_started_at: string | null; created_at: string; tier: string }) => {
    const startDate = sub.subscription_started_at
      ? new Date(sub.subscription_started_at)
      : new Date(sub.created_at);
    return startDate <= thirtyDaysAgo && sub.tier !== 'free';
  });

  let startingMrr = 0;
  let currentMrrFromExisting = 0;
  for (const sub of existingPayingUsers) {
    const userMrr = getUserMrr(sub.tier, sub.period);
    currentMrrFromExisting += userMrr;
    startingMrr += userMrr;
  }

  const nrr = startingMrr > 0
    ? Number(((currentMrrFromExisting / startingMrr) * 100).toFixed(1))
    : 100;

  // Active users (users with any activity in last 30 days)
  const activeUsers = mau;

  // User growth trend (daily data for last 90 days)
  const dailyUserGrowth: Record<string, number> = {};
  userGrowth.forEach((user: { created_at: string }) => {
    const dateStr = user.created_at.split('T')[0];
    dailyUserGrowth[dateStr] = (dailyUserGrowth[dateStr] || 0) + 1;
  });

  const days = Math.ceil((now.getTime() - ninetyDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
  const userGrowthTrend = [];
  let cumulativeUsers = totalUsers - userGrowth.length; // Starting point

  for (let i = 0; i < days; i++) {
    const date = new Date(ninetyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const newUsers = dailyUserGrowth[dateStr] || 0;
    cumulativeUsers += newUsers;

    userGrowthTrend.push({
      date: dateStr,
      users: cumulativeUsers,
      newUsers,
    });
  }

  return {
    mrr: Number(currentMrr.toFixed(2)),
    mrrGrowthPct,
    churnRate,
    dauMauRatio,
    nrr,
    totalUsers,
    activeUsers,
    dau,
    mau,
    userGrowthTrend,
  };
}
