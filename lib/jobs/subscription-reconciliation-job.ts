/**
 * Subscription reconciliation job (Phase 13 ops / billing safety net).
 *
 * `getUserTier` keeps a `past_due` subscription ENTITLED while Polar retries the
 * card during its dunning window, and only downgrades when Polar sends
 * `subscription.revoked`. That webhook is the single point of failure: if it is
 * missed (delivery failure, downtime, signature error), the user keeps paid
 * access indefinitely on a card that already gave up - a silent revenue leak.
 * Symmetrically, a missed recovery event can leave a recovered card stuck in
 * `past_due` locally.
 *
 * This job is the reconciliation backstop: once a day it re-reads every locally
 * `past_due` subscription's CURRENT status straight from Polar (the source of
 * truth) and repairs any drift. Scanning only `past_due` rows keeps the Polar
 * API cost bounded - active subscriptions don't need polling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getPolarClient } from '@/lib/polar';
import { logger } from '@/lib/logger';

export interface ReconciliationResult {
  /** Whether the job could run (false when Polar is unconfigured). */
  ran: boolean;
  /** past_due rows examined. */
  scanned: number;
  /** past_due -> active (Polar recovered the card; we missed the event). */
  recovered: number;
  /** past_due -> canceled/free (Polar gave up; we missed subscription.revoked). */
  revoked: number;
  /** Still genuinely past_due at Polar (dunning ongoing) - left entitled. */
  unchanged: number;
  /** Per-subscription failures (Polar fetch or DB write). */
  errors: string[];
}

// Polar subscription statuses that mean "no longer paying" -> mirror revoke.
const TERMINAL_STATUSES = new Set(['canceled', 'unpaid', 'revoked', 'incomplete_expired']);

export async function reconcilePastDueSubscriptions(
  supabaseAdmin: SupabaseClient,
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    ran: false,
    scanned: 0,
    recovered: 0,
    revoked: 0,
    unchanged: 0,
    errors: [],
  };

  const polar = await getPolarClient();
  if (!polar) {
    // Can't reconcile without Polar - report so the caller surfaces it rather
    // than silently claiming a clean run.
    logger.warn('Subscription reconciliation skipped: Polar not configured', {
      component: 'SubscriptionReconciliation',
      action: 'reconcile',
    });
    return result;
  }
  result.ran = true;

  // nosemgrep: supabase-missing-space-id-filter - subscriptions is keyed by user, not space-scoped
  const { data: rows, error } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, tier, status, polar_subscription_id, polar_customer_id, subscription_ends_at')
    .eq('status', 'past_due')
    .not('polar_subscription_id', 'is', null);

  if (error) {
    throw new Error(`Reconciliation query failed: ${error.message}`);
  }

  result.scanned = rows?.length ?? 0;

  for (const row of rows ?? []) {
    const subId = row.polar_subscription_id as string;
    try {
      // Owner rows are never billing-managed - skip defensively.
      if (row.tier === 'owner') {
        result.unchanged++;
        continue;
      }

      const polarSub = await polar.subscriptions.get({ id: subId });
      const polarStatus = (polarSub.status || '').toLowerCase();

      if (polarStatus === 'active') {
        // Polar recovered the card but we missed the update event.
        // nosemgrep: supabase-missing-space-id-filter - subscriptions is keyed by user, not space-scoped
        const { error: upErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('user_id', row.user_id);
        if (upErr) throw new Error(upErr.message);
        result.recovered++;
        logger.info('Reconciliation: past_due -> active (missed recovery event)', {
          component: 'SubscriptionReconciliation',
          userId: row.user_id,
          subscriptionId: subId,
        });
      } else if (TERMINAL_STATUSES.has(polarStatus)) {
        // Polar gave up. Mirror the subscription.revoked webhook exactly:
        // drop the Polar link, downgrade to free, mark canceled.
        // nosemgrep: supabase-missing-space-id-filter - subscriptions is keyed by user, not space-scoped
        const { error: upErr } = await supabaseAdmin
          .from('subscriptions')
          .update({
            polar_subscription_id: null,
            tier: 'free',
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', row.user_id);
        if (upErr) throw new Error(upErr.message);
        result.revoked++;
        logger.warn('Reconciliation: past_due -> free (missed subscription.revoked)', {
          component: 'SubscriptionReconciliation',
          userId: row.user_id,
          subscriptionId: subId,
          polarStatus,
        });
      } else {
        // Still past_due (or another non-terminal dunning state) - Polar is the
        // source of truth, so leave the user entitled until Polar resolves it.
        result.unchanged++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${subId}: ${msg}`);
      logger.error('Reconciliation failed for one subscription', err, {
        component: 'SubscriptionReconciliation',
        userId: row.user_id,
        subscriptionId: subId,
      });
    }
  }

  return result;
}
