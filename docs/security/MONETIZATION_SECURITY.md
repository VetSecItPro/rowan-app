# Monetization Security Documentation

**Last Updated**: December 11, 2024
**Version**: 1.0
**Status**: Active

## Overview

This document outlines the security measures implemented for the Rowan App monetization system, including Stripe payment processing, subscription management, and feature gating.

---

## Security Checklist

### Authentication & Authorization

- [x] **Stripe webhook signature verification** - All webhook payloads are verified using Stripe's signature validation
- [x] **No Stripe secret keys in client code** - All Stripe secret keys are server-side only
- [x] **All payment APIs require authentication** - Users must be authenticated to access subscription endpoints
- [x] **Space-based data isolation** - Subscription data is filtered by user and space

### Input Validation

- [x] **Zod validation on all payment endpoints** - Request bodies are validated with strict schemas
- [x] **Tier validation** - Only valid subscription tiers ('free', 'pro', 'family') are accepted
- [x] **Period validation** - Only valid billing periods ('monthly', 'annual') are accepted

### Rate Limiting

- [x] **Checkout creation rate limiting** - 5 requests per minute per user (Upstash Redis)
- [x] **API route rate limiting** - Standard rate limits apply to all subscription endpoints
- [x] **Webhook endpoint protection** - Rate limiting on webhook endpoint to prevent abuse

### Database Security

- [x] **RLS policies on subscription tables** - Users can only access their own subscription data
- [x] **Subscription events are read-only** - Users cannot modify subscription event history
- [x] **No direct database access from client** - All operations go through service layer

### Session Security

- [x] **Secure session management** - Supabase Auth handles session security
- [x] **Session validation on sensitive operations** - Fresh session check before payment operations
- [x] **CSRF protection** - Built-in Next.js CSRF protection on API routes

### Error Handling

- [x] **No sensitive data in error responses** - Error messages are user-friendly without stack traces
- [x] **Logging without PII exposure** - Payment logs don't include full card numbers or sensitive data
- [x] **Graceful webhook error handling** - Webhooks return 200 OK even on errors to prevent retries

---

## Threat Model

### Potential Threats

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Unauthorized subscription upgrade | High | Webhook signature verification, server-side price validation |
| Feature bypass | Medium | Server-side tier checks on all protected endpoints |
| Payment data theft | Critical | PCI-DSS compliance via Stripe (no card data touches our servers) |
| Subscription manipulation | High | RLS policies, user ID verification from session |
| Rate limit bypass | Medium | IP-based + user-based rate limiting |
| Webhook replay attacks | Medium | Stripe signature includes timestamp, reject old events |

### Attack Vectors

1. **Fake webhook events** - Mitigated by signature verification
2. **Session hijacking** - Mitigated by Supabase Auth security
3. **Direct database manipulation** - Mitigated by RLS policies
4. **API abuse** - Mitigated by rate limiting
5. **Cross-site attacks** - Mitigated by CSRF protection and CSP headers

---

## Security Implementation Details

### Webhook Signature Verification

```typescript
// lib/stripe/webhooks.ts
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripeClient();

  // This will throw if signature is invalid
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  return event;
}
```

### Rate Limiting

```typescript
// Upstash Redis rate limiting
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
});

// Applied to checkout creation
const { success } = await ratelimit.limit(`checkout:${userId}`);
if (!success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

### Input Validation

```typescript
// Zod schema for checkout session
const CreateCheckoutSessionSchema = z.object({
  tier: z.enum(['pro', 'family']),
  period: z.enum(['monthly', 'annual']),
});

// Validated in API route
const result = CreateCheckoutSessionSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json(
    { error: 'Invalid request' },
    { status: 400 }
  );
}
```

### RLS Policies

```sql
-- Users can only read their own subscription
CREATE POLICY "Users can read own subscription"
ON subscriptions FOR SELECT
USING (user_id = auth.uid());

-- Subscription events are read-only
CREATE POLICY "Users can read own subscription events"
ON subscription_events FOR SELECT
USING (user_id = auth.uid());
```

---

## Incident Response Plan

### Payment Failure Incidents

1. **Detection**: Monitor Stripe dashboard and webhook logs
2. **Assessment**: Check error rates and affected users
3. **Response**:
   - If isolated: Contact affected users individually
   - If widespread: Enable maintenance mode, investigate
4. **Recovery**: Verify fix, monitor for recurrence
5. **Documentation**: Log incident details and resolution

### Security Breach Protocol

1. **Immediate Actions**:
   - Rotate Stripe API keys
   - Invalidate affected sessions
   - Enable feature flag to disable monetization

2. **Investigation**:
   - Review access logs
   - Identify compromised data
   - Determine attack vector

3. **Notification**:
   - Notify affected users within 72 hours (GDPR)
   - Report to relevant authorities if required

4. **Remediation**:
   - Patch vulnerability
   - Implement additional monitoring
   - Update security documentation

---

## Compliance

### PCI-DSS Compliance

- **Scope**: Rowan App is out of PCI-DSS scope
- **Reason**: No card data touches our servers; all payment processing handled by Stripe
- **Stripe Compliance**: Stripe is a PCI Level 1 Service Provider

### GDPR Compliance

- **Data Minimization**: Only essential subscription data stored
- **Right to Deletion**: Subscriptions deleted with user account
- **Data Portability**: Subscription data included in export
- **Consent**: Explicit consent for payment processing

---

## Security Testing

### Automated Tests

- E2E tests verify authentication requirements
- E2E tests verify webhook signature rejection
- E2E tests verify input validation

### Manual Testing Checklist

- [ ] Attempt to access subscription data without authentication
- [ ] Attempt to upgrade subscription with invalid webhook signature
- [ ] Attempt to bypass feature gates via direct API calls
- [ ] Verify rate limiting blocks excessive requests
- [ ] Verify error messages don't leak sensitive information

### Periodic Audits

- Monthly: Review access logs and error rates
- Quarterly: Security audit of monetization code
- Annually: Third-party security assessment (recommended)

---

## Contact

**Security Issues**: security@rowan.app
**GitHub Security Advisories**: https://github.com/VetSecItPro/rowan-app/security/advisories

---

*This document should be reviewed and updated after any significant changes to the monetization system.*
