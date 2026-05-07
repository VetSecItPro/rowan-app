/**
 * Polar Sandbox helpers — synthetic webhook delivery + sandbox checkout creation.
 *
 * Production credentials are never touched here; these helpers read
 * POLAR_SANDBOX_* env vars exclusively. If those aren't set, helpers throw
 * at call-time so a spec doesn't accidentally exercise prod.
 *
 * Pattern is modeled on steelmotion's tests/e2e/learn/helpers/polar-fixture.ts
 * (May 2026 reference). Exercises everything we own (signature verifier,
 * schema parser, event dispatcher, DB writes) without requiring a publicly-
 * reachable URL for Polar to deliver to.
 */

import { createRequire } from 'module';
import { randomUUID } from 'node:crypto';

const SANDBOX_BASE_URL = 'https://sandbox-api.polar.sh';

function getSandboxConfig(): { accessToken: string } {
  const accessToken = process.env.POLAR_SANDBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('[polar-sandbox] POLAR_SANDBOX_ACCESS_TOKEN required.');
  }
  return { accessToken };
}

export interface CreateSandboxCheckoutInput {
  productId: string;
  customerEmail: string;
  successUrl?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a sandbox checkout. Returns the hosted URL Polar would normally
 * give a paying user. The URL points at sandbox.polar.sh — Playwright
 * could navigate to it for full UI tests, or specs can just verify the
 * URL was issued correctly.
 */
export async function createSandboxCheckout(
  input: CreateSandboxCheckoutInput,
): Promise<{ checkoutId: string; url: string }> {
  const { accessToken } = getSandboxConfig();
  const successUrl = input.successUrl ?? 'http://localhost:3000/billing?session={CHECKOUT_SESSION_ID}';

  const response = await fetch(`${SANDBOX_BASE_URL}/v1/checkouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      products: [input.productId],
      success_url: successUrl,
      customer_email: input.customerEmail,
      metadata: input.metadata ?? {},
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '<no body>');
    throw new Error(`[polar-sandbox] sandbox checkout create failed (${response.status}): ${body}`);
  }
  const json = (await response.json()) as { id: string; url: string };
  return { checkoutId: json.id, url: json.url };
}

export interface DeliverSyntheticWebhookInput {
  /** Local server's webhook route. Default `http://localhost:3000/api/webhooks/polar`. */
  url?: string;
  /** Polar event payload (already-shaped, including `type` field). */
  event: Record<string, unknown>;
  /** Override the webhook signing secret. Defaults to POLAR_SANDBOX_WEBHOOK_SECRET. */
  secret?: string;
}

/**
 * Synthesize a webhook delivery: sign the payload with the sandbox webhook
 * secret using Standard Webhooks (the spec Polar implements), POST to the
 * local route, return the response.
 *
 * Why "synthetic" — the alternative is driving a real Polar Checkout +
 * waiting for Polar to deliver the event to a publicly-reachable URL.
 * That requires Vercel preview infra + Polar dashboard config that isn't
 * always in place. Synthetic delivery exercises everything from the route
 * handler downward — signature verifier, schema parser, event dispatcher,
 * DB writes, email send. The only thing it skips is the Polar→server HTTP
 * hop, which is covered by Polar's own infra and test reports.
 *
 * Signing matches what `@polar-sh/sdk/webhooks.validateEvent` accepts: the
 * full secret string is base64-encoded, then passed to standardwebhooks
 * Webhook for signing. (See the SDK source: it base64-encodes the secret
 * before passing to standardwebhooks.)
 */
export async function deliverSyntheticWebhook(
  input: DeliverSyntheticWebhookInput,
): Promise<{ status: number; body: string }> {
  const secret = input.secret ?? process.env.POLAR_SANDBOX_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      '[polar-sandbox] POLAR_SANDBOX_ACCESS_TOKEN and POLAR_SANDBOX_WEBHOOK_SECRET required for synthetic webhook delivery.',
    );
  }

  const url = input.url ?? 'http://localhost:3000/api/webhooks/polar';
  const body = JSON.stringify(input.event);

  // Use createRequire because standardwebhooks ships only CJS exports;
  // tsx + ESM resolution can't find its package main otherwise.
  const req = createRequire(import.meta.url);
  const swh = req('standardwebhooks') as { Webhook: new (s: string) => { sign(id: string, ts: Date, b: string): string } };

  // Match Polar SDK's transform: base64-encode the full secret string,
  // then pass to standardwebhooks (which strips whsec_ prefix and
  // base64-decodes back to the raw bytes used as HMAC key).
  const base64Secret = Buffer.from(secret, 'utf-8').toString('base64');
  const wh = new swh.Webhook(base64Secret);

  const msgId = `msg_${randomUUID()}`;
  const timestamp = new Date();
  const signature = wh.sign(msgId, timestamp, body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-id': msgId,
      'webhook-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
      'webhook-signature': signature,
    },
    body,
  });
  const text = await response.text();
  return { status: response.status, body: text };
}

/**
 * Build a minimal but Zod-schema-valid `subscription.created` event for
 * use with deliverSyntheticWebhook. The fields here are the union of what
 * Polar's WebhookSubscriptionCreatedPayload schema requires — keep this
 * synced with the SDK's @polar-sh/sdk/webhooks types.
 */
export function buildSubscriptionCreatedEvent(input: {
  subscriptionId: string;
  productId: string;
  customerId: string;
  userId: string;
  billingInterval?: 'monthly' | 'annual';
}): Record<string, unknown> {
  return {
    type: 'subscription.created',
    data: {
      id: input.subscriptionId,
      productId: input.productId,
      customerId: input.customerId,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        userId: input.userId,
        billingInterval: input.billingInterval ?? 'monthly',
      },
    },
  };
}
