/**
 * Monetization Logger
 * Structured logging for all payment and subscription events
 *
 * Provides consistent, searchable logs for:
 * - Checkout sessions
 * - Webhook events
 * - Subscription changes
 * - Payment failures
 *
 * SECURITY: Server-side only - never expose to client
 *
 * Phase 9.2: Now persists logs to database for querying
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// DATABASE CLIENT (for log persistence)
// ============================================================================

// Use service role client for inserting logs (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[MONETIZATION_LOGGER] Supabase credentials not configured - logs will only go to console');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'info' | 'warn' | 'error';

export type MonetizationEventType =
  | 'checkout_initiated'
  | 'checkout_success'
  | 'checkout_failed'
  | 'checkout_abandoned'
  | 'webhook_received'
  | 'webhook_processed'
  | 'webhook_error'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_reactivated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'trial_started'
  | 'trial_ended'
  | 'upgrade_trigger_shown'
  | 'upgrade_trigger_clicked';

export interface MonetizationLogEntry {
  timestamp: string;
  level: LogLevel;
  event: MonetizationEventType;
  userId?: string;
  tier?: string;
  period?: string;
  amount?: number;
  currency?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  stripeEventId?: string;
  triggerSource?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

/**
 * Create a structured log entry for monetization events
 */
function createLogEntry(
  level: LogLevel,
  event: MonetizationEventType,
  data: Omit<MonetizationLogEntry, 'timestamp' | 'level' | 'event'>
): MonetizationLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  };
}

/**
 * Output log entry to console and persist to database
 * Phase 9.2: Now persists to monetization_logs table for querying
 */
async function outputLog(entry: MonetizationLogEntry): Promise<void> {
  const prefix = `[MONETIZATION]`;
  const logLine = JSON.stringify(entry);

  // Always log to console
  switch (entry.level) {
    case 'error':
      console.error(prefix, logLine);
      break;
    case 'warn':
      console.warn(prefix, logLine);
      break;
    default:
      console.log(prefix, logLine);
  }

  // Persist to database (non-blocking)
  persistLogToDatabase(entry).catch((err) => {
    console.error('[MONETIZATION_LOGGER] Failed to persist log:', err);
  });
}

/**
 * Persist log entry to database
 */
async function persistLogToDatabase(entry: MonetizationLogEntry): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('monetization_logs').insert({
      timestamp: entry.timestamp,
      level: entry.level,
      event: entry.event,
      user_id: entry.userId || null,
      tier: entry.tier || null,
      period: entry.period || null,
      amount: entry.amount || null,
      currency: entry.currency || 'usd',
      stripe_customer_id: entry.stripeCustomerId || null,
      stripe_subscription_id: entry.stripeSubscriptionId || null,
      stripe_session_id: entry.stripeSessionId || null,
      stripe_event_id: entry.stripeEventId || null,
      trigger_source: entry.triggerSource || null,
      error_message: entry.error || null,
      metadata: entry.metadata || {},
    });

    if (error) {
      console.error('[MONETIZATION_LOGGER] Database insert error:', error);
    }
  } catch (err) {
    console.error('[MONETIZATION_LOGGER] Database persistence error:', err);
  }
}

// ============================================================================
// CHECKOUT LOGGING
// ============================================================================

/**
 * Log checkout session initiation
 */
export function logCheckoutInitiated(data: {
  userId: string;
  tier: string;
  period: string;
  amount?: number;
  currency?: string;
  stripeSessionId?: string;
  triggerSource?: string;
}): void {
  const entry = createLogEntry('info', 'checkout_initiated', data);
  outputLog(entry);
}

/**
 * Log successful checkout completion
 */
export function logCheckoutSuccess(data: {
  userId: string;
  tier: string;
  period: string;
  amount?: number;
  currency?: string;
  stripeSessionId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}): void {
  const entry = createLogEntry('info', 'checkout_success', data);
  outputLog(entry);
}

/**
 * Log checkout failure
 */
export function logCheckoutFailed(data: {
  userId: string;
  tier: string;
  period: string;
  error: string;
  stripeSessionId?: string;
  metadata?: Record<string, unknown>;
}): void {
  const entry = createLogEntry('error', 'checkout_failed', data);
  outputLog(entry);
}

/**
 * Log abandoned checkout (session created but not completed)
 */
export function logCheckoutAbandoned(data: {
  userId?: string;
  tier?: string;
  period?: string;
  stripeSessionId: string;
}): void {
  const entry = createLogEntry('warn', 'checkout_abandoned', data);
  outputLog(entry);
}

// ============================================================================
// WEBHOOK LOGGING
// ============================================================================

/**
 * Log webhook received
 */
export function logWebhookReceived(data: {
  stripeEventId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}): void {
  const entry = createLogEntry('info', 'webhook_received', {
    stripeEventId: data.stripeEventId,
    metadata: {
      stripeEventType: data.eventType,
      ...data.metadata,
    },
  });
  outputLog(entry);
}

/**
 * Log webhook processed successfully
 */
export function logWebhookProcessed(data: {
  stripeEventId: string;
  eventType: string;
  userId?: string;
  processingTimeMs?: number;
}): void {
  const entry = createLogEntry('info', 'webhook_processed', {
    stripeEventId: data.stripeEventId,
    userId: data.userId,
    metadata: {
      stripeEventType: data.eventType,
      processingTimeMs: data.processingTimeMs,
    },
  });
  outputLog(entry);
}

/**
 * Log webhook processing error
 */
export function logWebhookError(data: {
  stripeEventId: string;
  eventType: string;
  error: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): void {
  const entry = createLogEntry('error', 'webhook_error', {
    stripeEventId: data.stripeEventId,
    userId: data.userId,
    error: data.error,
    metadata: {
      stripeEventType: data.eventType,
      ...data.metadata,
    },
  });
  outputLog(entry);
}

// ============================================================================
// SUBSCRIPTION LOGGING
// ============================================================================

/**
 * Log subscription creation
 */
export function logSubscriptionCreated(data: {
  userId: string;
  tier: string;
  period: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  amount?: number;
  currency?: string;
}): void {
  const entry = createLogEntry('info', 'subscription_created', data);
  outputLog(entry);
}

/**
 * Log subscription update (tier or period change)
 */
export function logSubscriptionUpdated(data: {
  userId: string;
  tier: string;
  period: string;
  stripeSubscriptionId: string;
  previousTier?: string;
  previousPeriod?: string;
  metadata?: Record<string, unknown>;
}): void {
  const entry = createLogEntry('info', 'subscription_updated', {
    ...data,
    metadata: {
      previousTier: data.previousTier,
      previousPeriod: data.previousPeriod,
      ...data.metadata,
    },
  });
  outputLog(entry);
}

/**
 * Log subscription cancellation
 */
export function logSubscriptionCancelled(data: {
  userId: string;
  tier: string;
  stripeSubscriptionId: string;
  reason?: string;
  cancelAtPeriodEnd?: boolean;
  periodEndDate?: string;
}): void {
  const entry = createLogEntry('info', 'subscription_cancelled', {
    userId: data.userId,
    tier: data.tier,
    stripeSubscriptionId: data.stripeSubscriptionId,
    metadata: {
      reason: data.reason,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      periodEndDate: data.periodEndDate,
    },
  });
  outputLog(entry);
}

/**
 * Log subscription reactivation
 */
export function logSubscriptionReactivated(data: {
  userId: string;
  tier: string;
  stripeSubscriptionId: string;
}): void {
  const entry = createLogEntry('info', 'subscription_reactivated', data);
  outputLog(entry);
}

// ============================================================================
// PAYMENT LOGGING
// ============================================================================

/**
 * Log successful payment
 */
export function logPaymentSucceeded(data: {
  userId: string;
  amount: number;
  currency: string;
  stripeSubscriptionId: string;
  invoiceId?: string;
}): void {
  const entry = createLogEntry('info', 'payment_succeeded', {
    ...data,
    metadata: {
      invoiceId: data.invoiceId,
    },
  });
  outputLog(entry);
}

/**
 * Log payment failure
 */
export function logPaymentFailed(data: {
  userId: string;
  amount?: number;
  currency?: string;
  stripeSubscriptionId: string;
  error: string;
  attemptCount?: number;
  invoiceId?: string;
}): void {
  const entry = createLogEntry('error', 'payment_failed', {
    userId: data.userId,
    amount: data.amount,
    currency: data.currency,
    stripeSubscriptionId: data.stripeSubscriptionId,
    error: data.error,
    metadata: {
      attemptCount: data.attemptCount,
      invoiceId: data.invoiceId,
    },
  });
  outputLog(entry);
}

// ============================================================================
// TRIAL LOGGING
// ============================================================================

/**
 * Log trial start
 */
export function logTrialStarted(data: {
  userId: string;
  tier: string;
  trialDays: number;
  trialEndDate: string;
}): void {
  const entry = createLogEntry('info', 'trial_started', {
    userId: data.userId,
    tier: data.tier,
    metadata: {
      trialDays: data.trialDays,
      trialEndDate: data.trialEndDate,
    },
  });
  outputLog(entry);
}

/**
 * Log trial end
 */
export function logTrialEnded(data: {
  userId: string;
  tier: string;
  convertedToPaid: boolean;
}): void {
  const entry = createLogEntry('info', 'trial_ended', {
    userId: data.userId,
    tier: data.tier,
    metadata: {
      convertedToPaid: data.convertedToPaid,
    },
  });
  outputLog(entry);
}

// ============================================================================
// UPGRADE TRIGGER LOGGING
// ============================================================================

/**
 * Log upgrade trigger (modal) shown
 */
export function logUpgradeTriggerShown(data: {
  userId: string;
  triggerSource: string;
  feature?: string;
  currentTier?: string;
}): void {
  const entry = createLogEntry('info', 'upgrade_trigger_shown', {
    userId: data.userId,
    triggerSource: data.triggerSource,
    tier: data.currentTier,
    metadata: {
      feature: data.feature,
    },
  });
  outputLog(entry);
}

/**
 * Log upgrade trigger clicked (user clicked upgrade button)
 */
export function logUpgradeTriggerClicked(data: {
  userId: string;
  triggerSource: string;
  targetTier: string;
  feature?: string;
  currentTier?: string;
}): void {
  const entry = createLogEntry('info', 'upgrade_trigger_clicked', {
    userId: data.userId,
    triggerSource: data.triggerSource,
    tier: data.targetTier,
    metadata: {
      feature: data.feature,
      currentTier: data.currentTier,
    },
  });
  outputLog(entry);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get all log entry types for filtering
 */
export const LOG_EVENT_TYPES: MonetizationEventType[] = [
  'checkout_initiated',
  'checkout_success',
  'checkout_failed',
  'checkout_abandoned',
  'webhook_received',
  'webhook_processed',
  'webhook_error',
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_reactivated',
  'payment_succeeded',
  'payment_failed',
  'trial_started',
  'trial_ended',
  'upgrade_trigger_shown',
  'upgrade_trigger_clicked',
];
