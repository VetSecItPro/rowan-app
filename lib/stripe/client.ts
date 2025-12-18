/**
 * Stripe Client Configuration
 * Server-side Stripe client for payment processing
 *
 * SECURITY: This file should ONLY be imported on the server side
 * Never import this in client components or pages
 */

import Stripe from 'stripe';

// Initialize Stripe client only if API key is available
// During build time, this may not be set, so we make it optional
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover', // Use latest stable API version
    typescript: true,
    appInfo: {
      name: 'Rowan App',
      version: '1.0.0',
    },
  });
}

// Export with runtime validation
export { stripe };

// Helper to get Stripe client with validation
export function getStripeClient(): Stripe {
  if (!stripe) {
    throw new Error(
      'Stripe is not initialized. Missing STRIPE_SECRET_KEY environment variable. ' +
      'Please add it to your .env.local file. ' +
      'Get your key from: https://dashboard.stripe.com/apikeys'
    );
  }
  return stripe;
}

// Helper to format amount for display
export function formatAmount(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Stripe amounts are in cents
}

// Helper to convert dollars to cents
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// Helper to convert cents to dollars
export function centsToDollars(cents: number): number {
  return cents / 100;
}
