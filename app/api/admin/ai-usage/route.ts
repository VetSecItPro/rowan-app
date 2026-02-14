/**
 * Admin AI Usage API — Comprehensive AI cost and usage data
 *
 * Returns: total tokens, cost estimates, top users, breakdown by feature/tier,
 * active conversations count, and daily trends.
 *
 * Query params:
 *   ?range=today|week|month (default: today)
 *   ?refresh=true (bypass cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface UsageRow {
  user_id: string;
  space_id: string;
  date: string;
  input_tokens: number;
  output_tokens: number;
  voice_seconds: number;
  conversation_count: number;
  tool_calls_count: number;
  feature_source: string;
  estimated_cost_usd: number;
}

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface MemberRow {
  user_id: string;
  role: string;
  spaces: { plan_type: string } | null;
}

function getDateRange(range: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];

  switch (range) {
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo.toISOString().split('T')[0], end };
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { start: monthAgo.toISOString().split('T')[0], end };
    }
    default: // today
      return { start: end, end };
  }
}

export async function GET(req: NextRequest) {
  // Rate limit
  const ip = extractIP(req.headers);
  const { success } = await checkGeneralRateLimit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Admin auth
  const auth = await verifyAdminAuth(req);
  if (!auth.isValid) {
    return NextResponse.json(
      { error: auth.error || 'Admin authentication required' },
      { status: 401 }
    );
  }

  try {
    const range = req.nextUrl.searchParams.get('range') || 'today';
    const { start, end } = getDateRange(range);

    // Fetch all usage rows for the date range
    const { data: usageRows, error: usageError } = await supabaseAdmin
      .from('ai_usage_daily')
      .select('user_id, space_id, date, input_tokens, output_tokens, voice_seconds, conversation_count, tool_calls_count, feature_source, estimated_cost_usd')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .limit(10000);

    if (usageError) {
      logger.error('[Admin AI] Failed to fetch usage data', usageError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    const rows: UsageRow[] = usageRows ?? [];

    // Aggregate totals
    const totals = rows.reduce(
      (acc, r) => ({
        input_tokens: acc.input_tokens + (r.input_tokens ?? 0),
        output_tokens: acc.output_tokens + (r.output_tokens ?? 0),
        voice_seconds: acc.voice_seconds + (r.voice_seconds ?? 0),
        conversations: acc.conversations + (r.conversation_count ?? 0),
        tool_calls: acc.tool_calls + (r.tool_calls_count ?? 0),
        cost_usd: acc.cost_usd + (r.estimated_cost_usd ?? 0),
      }),
      { input_tokens: 0, output_tokens: 0, voice_seconds: 0, conversations: 0, tool_calls: 0, cost_usd: 0 }
    );

    // Cost by feature
    const costByFeature: Record<string, number> = {};
    for (const r of rows) {
      const src = r.feature_source || 'chat';
      costByFeature[src] = (costByFeature[src] ?? 0) + (r.estimated_cost_usd ?? 0);
    }

    // Cost by date (for trend charts)
    const costByDate: Record<string, { cost: number; input_tokens: number; output_tokens: number }> = {};
    for (const r of rows) {
      if (!costByDate[r.date]) {
        costByDate[r.date] = { cost: 0, input_tokens: 0, output_tokens: 0 };
      }
      costByDate[r.date].cost += r.estimated_cost_usd ?? 0;
      costByDate[r.date].input_tokens += r.input_tokens ?? 0;
      costByDate[r.date].output_tokens += r.output_tokens ?? 0;
    }

    // Top users by cost
    const userCostMap: Record<string, { cost: number; input_tokens: number; output_tokens: number; conversations: number }> = {};
    for (const r of rows) {
      if (!userCostMap[r.user_id]) {
        userCostMap[r.user_id] = { cost: 0, input_tokens: 0, output_tokens: 0, conversations: 0 };
      }
      userCostMap[r.user_id].cost += r.estimated_cost_usd ?? 0;
      userCostMap[r.user_id].input_tokens += r.input_tokens ?? 0;
      userCostMap[r.user_id].output_tokens += r.output_tokens ?? 0;
      userCostMap[r.user_id].conversations += r.conversation_count ?? 0;
    }

    // Sort top users by cost, take top 20
    const topUserIds = Object.entries(userCostMap)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 20)
      .map(([id]) => id);

    // Fetch profiles for top users
    let profileMap: Record<string, ProfileRow> = {};
    if (topUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', topUserIds);

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p: ProfileRow) => [p.id, p]));
      }
    }

    // Fetch tier info for top users via space_members -> spaces
    const userTierMap: Record<string, string> = {};
    if (topUserIds.length > 0) {
      const { data: members } = await supabaseAdmin
        .from('space_members')
        .select('user_id, role, spaces:space_id(plan_type)')
        .in('user_id', topUserIds);

      if (members) {
        for (const m of members as unknown as MemberRow[]) {
          const plan = m.spaces?.plan_type || 'free';
          userTierMap[m.user_id] = plan;
        }
      }
    }

    const topUsers = topUserIds.map((uid) => ({
      user_id: uid,
      email: profileMap[uid]?.email ?? 'Unknown',
      name: profileMap[uid]?.full_name ?? null,
      tier: userTierMap[uid] ?? 'free',
      ...userCostMap[uid],
    }));

    // Cost by tier
    const costByTier: Record<string, number> = {};
    for (const uid of Object.keys(userCostMap)) {
      const tier = userTierMap[uid] ?? 'free';
      costByTier[tier] = (costByTier[tier] ?? 0) + userCostMap[uid].cost;
    }

    // Cost by space
    const costBySpace: Record<string, number> = {};
    for (const r of rows) {
      costBySpace[r.space_id] = (costBySpace[r.space_id] ?? 0) + (r.estimated_cost_usd ?? 0);
    }
    const topSpaces = Object.entries(costBySpace)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([space_id, cost]) => ({ space_id, cost }));

    // Active AI users (unique users with usage today)
    const today = new Date().toISOString().split('T')[0];
    const activeUsersToday = new Set(
      rows.filter((r) => r.date === today).map((r) => r.user_id)
    ).size;

    // Daily trend (sorted ascending for charts)
    const dailyTrend = Object.entries(costByDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));

    return NextResponse.json({
      range,
      totals: {
        ...totals,
        cost_usd: Math.round(totals.cost_usd * 1_000_000) / 1_000_000,
      },
      active_users_today: activeUsersToday,
      cost_by_feature: Object.entries(costByFeature).map(([feature, cost]) => ({
        feature,
        cost: Math.round(cost * 1_000_000) / 1_000_000,
      })),
      cost_by_tier: Object.entries(costByTier).map(([tier, cost]) => ({
        tier,
        cost: Math.round(cost * 1_000_000) / 1_000_000,
      })),
      cost_by_space: topSpaces.map((s) => ({
        ...s,
        cost: Math.round(s.cost * 1_000_000) / 1_000_000,
      })),
      daily_trend: dailyTrend.map((d) => ({
        ...d,
        cost: Math.round(d.cost * 1_000_000) / 1_000_000,
      })),
      top_users: topUsers.map((u) => ({
        ...u,
        cost: Math.round(u.cost * 1_000_000) / 1_000_000,
      })),
    });
  } catch (err) {
    logger.error('[Admin AI] Unhandled error in ai-usage endpoint', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
