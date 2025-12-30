/**
 * Stripe Invoices API
 * Returns recent invoices for display in subscription settings
 * Users can see their billing history without leaving the app
 *
 * OPTIMIZATION: 30-minute Redis cache for invoice list
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { cacheAside, cacheKeys, CACHE_TTL } from '@/lib/cache';

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

interface InvoiceResponse {
  invoices: InvoiceData[];
  hasMore: boolean;
  message?: string;
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
        hasMore: false,
        message: 'No billing history available'
      });
    }

    // Use Redis cache for invoice data (30-minute TTL)
    // Invoices don't change frequently, so aggressive caching is safe
    const cacheKey = cacheKeys.invoices(subscription.stripe_customer_id);

    const invoiceResponse = await cacheAside<InvoiceResponse>(
      cacheKey,
      async () => {
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

        return {
          invoices: invoiceData,
          hasMore: invoices.has_more,
        };
      },
      CACHE_TTL.VERY_LONG / 2 // 30 minutes (half of 1 hour)
    );

    return NextResponse.json(invoiceResponse);

  } catch (error) {
    logger.error('Error fetching invoices:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
