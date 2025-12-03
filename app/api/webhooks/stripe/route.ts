/**
 * API Route: Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Receives and processes Stripe webhook events
 *
 * IMPORTANT: This route must be configured in Stripe Dashboard
 * Webhook URL: https://your-domain.com/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, handleWebhookEvent } from '../../../../lib/stripe/webhooks';

// Disable body parsing - Stripe needs raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get raw body as text
    const body = await request.text();

    // Get Stripe signature from headers
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature and construct event
    const event = constructWebhookEvent(body, signature);

    // Handle the webhook event
    await handleWebhookEvent(event);

    // Return success response
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}
