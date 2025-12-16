/**
 * Stripe Invoices API
 * Returns recent invoices for display in subscription settings
 * Users can see their billing history without leaving the app
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

interface InvoiceData {
  id: string;
  number: string | null;
  date: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription with Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({
        invoices: [],
        message: 'No billing history available'
      });
    }

    const stripe = getStripeClient();

    // Fetch last 5 invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 5,
    });

    // Transform to our format
    const invoiceData: InvoiceData[] = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      date: new Date(invoice.created * 1000).toISOString(),
      amount: (invoice.amount_paid || invoice.amount_due) / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status || 'unknown',
      pdfUrl: invoice.invoice_pdf ?? null,
      hostedUrl: invoice.hosted_invoice_url ?? null,
    }));

    return NextResponse.json({
      invoices: invoiceData,
      hasMore: invoices.has_more,
    });

  } catch (error) {
    logger.error('Error fetching invoices:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
