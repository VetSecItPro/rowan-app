/**
 * Stripe Invoices API
 * Returns recent invoices for display in subscription settings
 * Users can see their billing history without leaving the app
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';

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
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
