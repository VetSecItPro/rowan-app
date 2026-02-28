/**
 * Subscription Analytics Service
 * Server-side service for tracking and analyzing subscription metrics
 *
 * Provides:
 * - Revenue metrics (MRR, ARR, ARPU)
 * - Subscription distribution by tier
 * - Churn and conversion tracking
 * - Event history analytics
 */

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { POLAR_PLANS } from '@/lib/polar';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionMetrics {
  // Revenue Metrics
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  arpu: number; // Average Revenue Per User

  // Subscriber Counts
  totalSubscribers: number;
  proSubscribers: number;
  familySubscribers: number;
  freeUsers: number;

  // Distribution
  tierDistribution: {
    tier: string;
    count: number;
    percentage: number;
    mrr: number;
  }[];

  periodDistribution: {
    period: string;
    count: number;
    percentage: number;
  }[];

  // Growth & Retention
  newSubscriptionsThisMonth: number;
  cancellationsThisMonth: number;
  netGrowth: number;
  churnRate: number;
  conversionRate: number; // Free to paid

  // Event Counts
  recentEvents: {
    created: number;
    upgraded: number;
    downgraded: number;
    cancelled: number;
    reactivated: number;
    paymentFailed: number;
  };
}

export interface SubscriptionEvent {
  id: string;
  userId: string;
  eventType: string;
  fromTier: string | null;
  toTier: string | null;
  triggerSource: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  userEmail?: string;
}

export interface DailyRevenueData {
  date: string;
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  newSubscriptions: number;
  cancellations: number;
  upgrades: number;
  downgrades: number;
  reactivations: number;
}

// Database row types from Supabase
interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  period: string;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionEventRow {
  id: string;
  user_id: string;
  event_type: string;
  from_tier: string | null;
  to_tier: string | null;
  trigger_source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate MRR for a subscription based on tier and period
 */
function calculateMRR(tier: string, period: string): number {
  if (tier === 'free' || tier === 'owner' || !tier) return 0;

  const tierKey = tier as 'pro' | 'family';
  if (!POLAR_PLANS[tierKey]) return 0;

  if (period === 'annual') {
    // Annual subscribers contribute their annual price / 12 to MRR
    return POLAR_PLANS[tierKey].annualPrice / 12;
  } else {
    // Monthly subscribers contribute their monthly price to MRR
    return POLAR_PLANS[tierKey].price;
  }
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get comprehensive subscription analytics
 */
export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Use supabaseAdmin to bypass RLS — this is an admin-only function that needs to see ALL subscriptions
  const { data: subscriptions, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, tier, status, period, polar_customer_id, polar_subscription_id, subscription_started_at, subscription_ends_at, created_at, updated_at')
    .in('status', ['active', 'past_due']);

  if (subError) {
    logger.error('Error fetching subscriptions:', subError, { component: 'lib-subscription-analytics-service', action: 'service_call' });
    throw subError;
  }

  // Fetch subscription events for this month
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('subscription_events')
    .select('id, user_id, event_type, from_tier, to_tier, trigger_source, metadata, created_at')
    .gte('created_at', startOfMonth.toISOString());

  if (eventsError) {
    logger.error('Error fetching subscription events:', eventsError, { component: 'lib-subscription-analytics-service', action: 'service_call' });
  }

  // Fetch total REAL users from auth.users (public.users has stale/orphaned rows)
  const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, page: 1 });
  const totalUsersCount = authUsersData?.users?.length ?? 0;

  const activeSubscriptions: SubscriptionRow[] = subscriptions || [];
  const subscriptionEvents: SubscriptionEventRow[] = events || [];

  // Calculate metrics — exclude free and owner tiers from paid subscriber counts
  const paidSubscriptions = activeSubscriptions.filter(s => s.tier !== 'free' && s.tier !== 'owner');
  const proSubs = activeSubscriptions.filter(s => s.tier === 'pro');
  const familySubs = activeSubscriptions.filter(s => s.tier === 'family');

  // Calculate MRR (calculateMRR already returns 0 for free/owner)
  let mrr = 0;
  activeSubscriptions.forEach(sub => {
    mrr += calculateMRR(sub.tier, sub.period);
  });

  // Round to 2 decimal places
  mrr = Math.round(mrr * 100) / 100;
  const arr = Math.round(mrr * 12 * 100) / 100;

  const totalSubscribers = paidSubscriptions.length;
  const arpu = totalSubscribers > 0 ? Math.round((mrr / totalSubscribers) * 100) / 100 : 0;

  // Tier distribution
  const tierDistribution = [
    {
      tier: 'Pro',
      count: proSubs.length,
      percentage: totalSubscribers > 0 ? Math.round((proSubs.length / totalSubscribers) * 100) : 0,
      mrr: proSubs.reduce((sum, s) => sum + calculateMRR(s.tier, s.period), 0),
    },
    {
      tier: 'Family',
      count: familySubs.length,
      percentage: totalSubscribers > 0 ? Math.round((familySubs.length / totalSubscribers) * 100) : 0,
      mrr: familySubs.reduce((sum, s) => sum + calculateMRR(s.tier, s.period), 0),
    },
  ];

  // Period distribution
  const monthlySubs = activeSubscriptions.filter(s => s.period === 'monthly');
  const annualSubs = activeSubscriptions.filter(s => s.period === 'annual');

  const periodDistribution = [
    {
      period: 'Monthly',
      count: monthlySubs.length,
      percentage: totalSubscribers > 0 ? Math.round((monthlySubs.length / totalSubscribers) * 100) : 0,
    },
    {
      period: 'Annual',
      count: annualSubs.length,
      percentage: totalSubscribers > 0 ? Math.round((annualSubs.length / totalSubscribers) * 100) : 0,
    },
  ];

  // Event counts this month
  const recentEvents = {
    created: subscriptionEvents.filter(e => e.event_type === 'subscription_created').length,
    upgraded: subscriptionEvents.filter(e => e.event_type === 'subscription_upgraded').length,
    downgraded: subscriptionEvents.filter(e => e.event_type === 'subscription_downgraded').length,
    cancelled: subscriptionEvents.filter(e => e.event_type === 'subscription_cancelled').length,
    reactivated: subscriptionEvents.filter(e => e.event_type === 'subscription_reactivated').length,
    paymentFailed: subscriptionEvents.filter(e => e.event_type === 'payment_failed').length,
  };

  // Calculate growth metrics
  const newSubscriptionsThisMonth = recentEvents.created + recentEvents.reactivated;
  const cancellationsThisMonth = recentEvents.cancelled;
  const netGrowth = newSubscriptionsThisMonth - cancellationsThisMonth;

  // Churn rate (cancellations / total subscribers at start of month)
  // For simplicity, we use current subscribers as approximation
  const churnRate = totalSubscribers > 0
    ? Math.round((cancellationsThisMonth / totalSubscribers) * 10000) / 100
    : 0;

  // Free users: count subscriptions on free tier + users without any subscription
  // Note: public.users table may have stale rows, so derive from auth user count minus paid/owner
  const freeTierSubs = activeSubscriptions.filter(s => s.tier === 'free').length;
  const totalUsers = totalUsersCount;
  // Users without any subscription row are also free users
  const usersWithoutSubscription = Math.max(0, totalUsers - activeSubscriptions.length);
  const freeUsers = freeTierSubs + usersWithoutSubscription;

  // Conversion rate (new paid / total free users who could convert)
  const conversionRate = freeUsers > 0
    ? Math.round((newSubscriptionsThisMonth / freeUsers) * 10000) / 100
    : 0;

  return {
    mrr,
    arr,
    arpu,
    totalSubscribers,
    proSubscribers: proSubs.length,
    familySubscribers: familySubs.length,
    freeUsers: Math.max(0, freeUsers),
    tierDistribution,
    periodDistribution,
    newSubscriptionsThisMonth,
    cancellationsThisMonth,
    netGrowth,
    churnRate,
    conversionRate,
    recentEvents,
  };
}

/**
 * Get subscription events with pagination
 */
export async function getSubscriptionEvents(options: {
  limit?: number;
  offset?: number;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{ events: SubscriptionEvent[]; total: number }> {
  const { limit = 50, offset = 0, eventType, startDate, endDate } = options;

  let query = supabaseAdmin
    .from('subscription_events')
    .select('id, user_id, event_type, from_tier, to_tier, trigger_source, metadata, created_at, users!inner(email)', { count: 'exact' });

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('Error fetching subscription events:', error, { component: 'lib-subscription-analytics-service', action: 'service_call' });
    // Return empty on error
    return { events: [], total: 0 };
  }

  const events: SubscriptionEvent[] = (data || []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    userId: e.user_id as string,
    eventType: e.event_type as string,
    fromTier: (e.from_tier as string) || null,
    toTier: (e.to_tier as string) || null,
    triggerSource: (e.trigger_source as string) || null,
    metadata: (e.metadata as Record<string, unknown>) || {},
    createdAt: e.created_at as string,
    userEmail: ((e.users as Record<string, unknown>)?.email as string) || undefined,
  }));

  return { events, total: count || 0 };
}

/**
 * Get daily revenue data for charts via event replay.
 *
 * Algorithm:
 * 1. Calculate current MRR from active subscriptions.
 * 2. Fetch all events in the requested period.
 * 3. Work backward from today's known MRR to calculate the MRR at the start
 *    of the period by reversing every event's MRR impact.
 * 4. Then replay events forward day-by-day, building actual daily MRR.
 */
export async function getDailyRevenueData(days: number = 30): Promise<DailyRevenueData[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Fetch subscription events for the period
  const { data: events } = await supabaseAdmin
    .from('subscription_events')
    .select('id, user_id, event_type, from_tier, to_tier, trigger_source, metadata, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  // Fetch current subscriptions to know each user's billing period
  const { data: subscriptions } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, tier, status, period')
    .in('status', ['active', 'past_due']);

  // Build a lookup of user → period (default to 'monthly' if unknown)
  const userPeriod: Record<string, string> = {};
  const currentSubscriptions = subscriptions || [];
  currentSubscriptions.forEach((sub) => {
    userPeriod[sub.user_id] = sub.period || 'monthly';
  });

  // Calculate current MRR as our known anchor point
  let currentMRR = 0;
  currentSubscriptions.forEach((sub) => {
    currentMRR += calculateMRR(sub.tier, sub.period);
  });

  const eventsList: SubscriptionEventRow[] = events || [];

  // Helper: get the MRR delta for an event (positive = MRR increased)
  const getEventMrrDelta = (event: SubscriptionEventRow): number => {
    const period = userPeriod[event.user_id] || 'monthly';
    switch (event.event_type) {
      case 'subscription_created':
        return calculateMRR(event.to_tier || 'free', period);
      case 'subscription_cancelled':
        return -calculateMRR(event.from_tier || 'free', period);
      case 'subscription_upgraded':
      case 'subscription_downgraded': {
        const oldMrr = calculateMRR(event.from_tier || 'free', period);
        const newMrr = calculateMRR(event.to_tier || 'free', period);
        return newMrr - oldMrr;
      }
      case 'subscription_reactivated':
        return calculateMRR(event.to_tier || 'free', period);
      default:
        return 0;
    }
  };

  // Work backward from currentMRR: reverse all events to find MRR at startDate
  let startMRR = currentMRR;
  for (let i = eventsList.length - 1; i >= 0; i--) {
    startMRR -= getEventMrrDelta(eventsList[i]);
  }
  // Ensure non-negative (rounding errors or missing events)
  startMRR = Math.max(0, startMRR);

  // Replay events forward day-by-day
  const dailyData: DailyRevenueData[] = [];
  let runningMRR = startMRR;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];

    // Get events for this day
    const dayEvents = eventsList.filter((e) => e.created_at.startsWith(dateStr));

    let dayNewMrr = 0;
    let dayChurnedMrr = 0;
    let newSubscriptions = 0;
    let cancellations = 0;
    let upgrades = 0;
    let downgrades = 0;
    let reactivations = 0;

    for (const event of dayEvents) {
      const delta = getEventMrrDelta(event);

      switch (event.event_type) {
        case 'subscription_created':
          newSubscriptions++;
          if (delta > 0) dayNewMrr += delta;
          break;
        case 'subscription_cancelled':
          cancellations++;
          if (delta < 0) dayChurnedMrr += Math.abs(delta);
          break;
        case 'subscription_upgraded':
          upgrades++;
          if (delta > 0) dayNewMrr += delta;
          else if (delta < 0) dayChurnedMrr += Math.abs(delta);
          break;
        case 'subscription_downgraded':
          downgrades++;
          if (delta < 0) dayChurnedMrr += Math.abs(delta);
          else if (delta > 0) dayNewMrr += delta;
          break;
        case 'subscription_reactivated':
          reactivations++;
          if (delta > 0) dayNewMrr += delta;
          break;
      }

      runningMRR += delta;
    }

    // Ensure non-negative
    runningMRR = Math.max(0, runningMRR);

    dailyData.push({
      date: dateStr,
      mrr: Math.round(runningMRR * 100) / 100,
      newMrr: Math.round(dayNewMrr * 100) / 100,
      churnedMrr: Math.round(dayChurnedMrr * 100) / 100,
      newSubscriptions,
      cancellations,
      upgrades,
      downgrades,
      reactivations,
    });
  }

  return dailyData;
}

/**
 * Log a subscription event
 */
export async function logSubscriptionEvent(
  userId: string,
  eventType: string,
  options: {
    fromTier?: string;
    toTier?: string;
    triggerSource?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    from_tier: options.fromTier || null,
    to_tier: options.toTier || null,
    trigger_source: options.triggerSource || 'app',
    metadata: options.metadata || {},
  });

  if (error) {
    logger.error('Error logging subscription event:', error, { component: 'lib-subscription-analytics-service', action: 'service_call' });
  }
}

/**
 * Get subscription by user ID
 */
export async function getUserSubscription(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, tier, status, period, polar_customer_id, polar_subscription_id, subscription_started_at, subscription_ends_at, created_at, updated_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is ok
    logger.error('Error fetching user subscription:', error, { component: 'lib-subscription-analytics-service', action: 'service_call' });
  }

  return data;
}
