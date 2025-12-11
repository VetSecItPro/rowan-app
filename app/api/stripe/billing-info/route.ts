/**
 * Stripe Billing Info API
 * Returns billing summary (next billing date, amount, payment method)
 * for display in the subscription settings
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription with Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, tier, period, status')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id || !subscription?.stripe_subscription_id) {
      return NextResponse.json({
        hasBillingInfo: false,
        message: 'No active subscription'
      });
    }

    const stripe = getStripeClient();

    // Get subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id,
      { expand: ['default_payment_method'] }
    );

    // Get payment method details
    let paymentMethod = null;
    if (stripeSubscription.default_payment_method && typeof stripeSubscription.default_payment_method !== 'string') {
      const pm = stripeSubscription.default_payment_method;
      if (pm.type === 'card' && pm.card) {
        paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        };
      }
    }

    // Calculate next billing info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPeriodEnd = (stripeSubscription as any).current_period_end;
    const nextBillingDate = new Date(currentPeriodEnd * 1000);

    // Get upcoming invoice for amount
    let nextAmount = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
        customer: subscription.stripe_customer_id,
        subscription: subscription.stripe_subscription_id,
      });
      nextAmount = upcomingInvoice.amount_due / 100; // Convert cents to dollars
    } catch {
      // Upcoming invoice may not exist if subscription is canceled
    }

    return NextResponse.json({
      hasBillingInfo: true,
      nextBillingDate: nextBillingDate.toISOString(),
      nextAmount,
      currency: stripeSubscription.currency.toUpperCase(),
      paymentMethod,
      status: stripeSubscription.status,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    });

  } catch (error) {
    console.error('Error fetching billing info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing information' },
      { status: 500 }
    );
  }
}
