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
  trialUsers: number;

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
  subscriptions: number;
  cancellations: number;
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
  trial_started_at: string | null;
  trial_ends_at: string | null;
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
  if (tier === 'free' || !tier) return 0;

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
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch all active subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .in('status', ['active', 'past_due']);

  if (subError) {
    logger.error('Error fetching subscriptions:', subError, { component: 'lib-subscription-analytics-service', action: 'service_call' });
    throw subError;
  }

  // Fetch subscription events for this month
  const { data: events, error: eventsError } = await supabase
    .from('subscription_events')
    .select('*')
    .gte('created_at', startOfMonth.toISOString());

  if (eventsError) {
    logger.error('Error fetching subscription events:', eventsError, { component: 'lib-subscription-analytics-service', action: 'service_call' });
  }

  // Fetch trial users
  const { data: trials } = await supabase
    .from('subscriptions')
    .select('*')
    .not('trial_ends_at', 'is', null)
    .gt('trial_ends_at', now.toISOString());

  // Fetch free users (users with no subscription or expired trial)
  const { count: totalUsersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const activeSubscriptions: SubscriptionRow[] = subscriptions || [];
  const subscriptionEvents: SubscriptionEventRow[] = events || [];
  const trialSubscriptions: SubscriptionRow[] = trials || [];

  // Calculate metrics
  const proSubs = activeSubscriptions.filter(s => s.tier === 'pro');
  const familySubs = activeSubscriptions.filter(s => s.tier === 'family');

  // Calculate MRR
  let mrr = 0;
  activeSubscriptions.forEach(sub => {
    mrr += calculateMRR(sub.tier, sub.period);
  });

  // Round to 2 decimal places
  mrr = Math.round(mrr * 100) / 100;
  const arr = Math.round(mrr * 12 * 100) / 100;

  const totalSubscribers = activeSubscriptions.length;
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

  // Free users calculation
  const totalUsers = totalUsersCount || 0;
  const freeUsers = totalUsers - totalSubscribers - trialSubscriptions.length;

  // Conversion rate (new paid / total free users who could convert)
  const potentialConverts = freeUsers + trialSubscriptions.length;
  const conversionRate = potentialConverts > 0
    ? Math.round((newSubscriptionsThisMonth / potentialConverts) * 10000) / 100
    : 0;

  return {
    mrr,
    arr,
    arpu,
    totalSubscribers,
    proSubscribers: proSubs.length,
    familySubscribers: familySubs.length,
    freeUsers: Math.max(0, freeUsers),
    trialUsers: trialSubscriptions.length,
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
  const supabase = await createClient();
  const { limit = 50, offset = 0, eventType, startDate, endDate } = options;

  let query = supabase
    .from('subscription_events')
    .select('*, users!inner(email)', { count: 'exact' });

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
 * Get daily revenue data for charts
 */
export async function getDailyRevenueData(days: number = 30): Promise<DailyRevenueData[]> {
  const supabase = await createClient();
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Fetch subscription events for the period
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  // Fetch current subscriptions for MRR calculation
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .in('status', ['active', 'past_due']);

  // Calculate current MRR as baseline
  const currentSubscriptions: SubscriptionRow[] = subscriptions || [];
  let currentMRR = 0;
  currentSubscriptions.forEach((sub: SubscriptionRow) => {
    currentMRR += calculateMRR(sub.tier, sub.period);
  });

  // Generate daily data points
  const dailyData: DailyRevenueData[] = [];
  const eventsList: SubscriptionEventRow[] = events || [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];

    // Count events for this day
    const dayEvents = eventsList.filter((e: SubscriptionEventRow) =>
      e.created_at.startsWith(dateStr)
    );

    const newSubs = dayEvents.filter((e: SubscriptionEventRow) =>
      e.event_type === 'subscription_created'
    ).length;

    const cancellations = dayEvents.filter((e: SubscriptionEventRow) =>
      e.event_type === 'subscription_cancelled'
    ).length;

    // Estimate MRR changes (simplified - assumes average plan price)
    const avgMRR = currentMRR / (subscriptions?.length || 1);
    const newMrr = newSubs * avgMRR;
    const churnedMrr = cancellations * avgMRR;

    dailyData.push({
      date: dateStr,
      mrr: Math.round((currentMRR - (days - i - 1) * (newMrr - churnedMrr) / days) * 100) / 100,
      newMrr: Math.round(newMrr * 100) / 100,
      churnedMrr: Math.round(churnedMrr * 100) / 100,
      subscriptions: newSubs,
      cancellations,
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
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is ok
    logger.error('Error fetching user subscription:', error, { component: 'lib-subscription-analytics-service', action: 'service_call' });
  }

  return data;
}
