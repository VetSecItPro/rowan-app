/**
 * Unit tests for lib/polar.ts
 *
 * Tests:
 * - POLAR_PLANS configuration shape
 * - getPlanFromProductId: maps product IDs to tiers
 * - getProductId: maps tier + interval to product IDs
 * - getPolarTrialDays: returns correct trial days per plan
 * - getPolarAnnualSavings: calculates savings, percentage, months free
 * - createCheckoutUrl: returns URL on success, null on failure/no client
 * - createCustomerPortalUrl: returns URL on success, null on failure/no client
 * - cancelSubscription: returns true on success, false on failure/no client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock fns for @polar-sh/sdk dynamic import
// ---------------------------------------------------------------------------
const { mockCheckoutsCreate, mockCustomerSessionsCreate, mockSubscriptionsUpdate } = vi.hoisted(() => ({
  mockCheckoutsCreate: vi.fn(),
  mockCustomerSessionsCreate: vi.fn(),
  mockSubscriptionsUpdate: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock @polar-sh/sdk as a dynamic import target
vi.mock('@polar-sh/sdk', () => ({
  Polar: class {
    checkouts = { create: mockCheckoutsCreate };
    customerSessions = { create: mockCustomerSessionsCreate };
    subscriptions = { update: mockSubscriptionsUpdate };
  },
}));

import {
  POLAR_PLANS,
  getPlanFromProductId,
  getProductId,
  getPolarTrialDays,
  getPolarAnnualSavings,
  createCheckoutUrl,
  createCustomerPortalUrl,
  cancelSubscription,
} from '@/lib/polar';

// ---------------------------------------------------------------------------
// POLAR_PLANS
// ---------------------------------------------------------------------------
describe('POLAR_PLANS', () => {
  it('defines all four tiers: free, pro, family, owner', () => {
    expect(POLAR_PLANS).toHaveProperty('free');
    expect(POLAR_PLANS).toHaveProperty('pro');
    expect(POLAR_PLANS).toHaveProperty('family');
    expect(POLAR_PLANS).toHaveProperty('owner');
  });

  it('free plan has price 0', () => {
    expect(POLAR_PLANS.free.price).toBe(0);
    expect(POLAR_PLANS.free.annualPrice).toBe(0);
  });

  it('pro plan has a positive monthly price', () => {
    expect(POLAR_PLANS.pro.price).toBeGreaterThan(0);
  });

  it('family plan has a higher monthly price than pro', () => {
    expect(POLAR_PLANS.family.price).toBeGreaterThan(POLAR_PLANS.pro.price);
  });

  it('pro has 14 trial days', () => {
    expect(POLAR_PLANS.pro.trialDays).toBe(14);
  });

  it('family has 14 trial days', () => {
    expect(POLAR_PLANS.family.trialDays).toBe(14);
  });

  it('owner has 0 trial days', () => {
    expect(POLAR_PLANS.owner.trialDays).toBe(0);
  });

  it('each plan has a non-empty features array', () => {
    for (const [, plan] of Object.entries(POLAR_PLANS)) {
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getPlanFromProductId
// ---------------------------------------------------------------------------
describe('getPlanFromProductId', () => {
  beforeEach(() => {
    process.env.POLAR_PRO_MONTHLY_PRODUCT_ID = 'prod_pro_monthly';
    process.env.POLAR_PRO_ANNUAL_PRODUCT_ID = 'prod_pro_annual';
    process.env.POLAR_FAMILY_MONTHLY_PRODUCT_ID = 'prod_family_monthly';
    process.env.POLAR_FAMILY_ANNUAL_PRODUCT_ID = 'prod_family_annual';
  });

  afterEach(() => {
    delete process.env.POLAR_PRO_MONTHLY_PRODUCT_ID;
    delete process.env.POLAR_PRO_ANNUAL_PRODUCT_ID;
    delete process.env.POLAR_FAMILY_MONTHLY_PRODUCT_ID;
    delete process.env.POLAR_FAMILY_ANNUAL_PRODUCT_ID;
  });

  it('returns "pro" for pro monthly product ID', () => {
    expect(getPlanFromProductId('prod_pro_monthly')).toBe('pro');
  });

  it('returns "pro" for pro annual product ID', () => {
    expect(getPlanFromProductId('prod_pro_annual')).toBe('pro');
  });

  it('returns "family" for family monthly product ID', () => {
    expect(getPlanFromProductId('prod_family_monthly')).toBe('family');
  });

  it('returns "family" for family annual product ID', () => {
    expect(getPlanFromProductId('prod_family_annual')).toBe('family');
  });

  it('returns "free" for unknown product ID', () => {
    expect(getPlanFromProductId('unknown_product')).toBe('free');
  });

  it('returns "free" for empty string', () => {
    expect(getPlanFromProductId('')).toBe('free');
  });
});

// ---------------------------------------------------------------------------
// getProductId
// ---------------------------------------------------------------------------
describe('getProductId', () => {
  beforeEach(() => {
    process.env.POLAR_PRO_MONTHLY_PRODUCT_ID = 'prod_pro_monthly';
    process.env.POLAR_PRO_ANNUAL_PRODUCT_ID = 'prod_pro_annual';
    process.env.POLAR_FAMILY_MONTHLY_PRODUCT_ID = 'prod_family_monthly';
    process.env.POLAR_FAMILY_ANNUAL_PRODUCT_ID = 'prod_family_annual';
  });

  afterEach(() => {
    delete process.env.POLAR_PRO_MONTHLY_PRODUCT_ID;
    delete process.env.POLAR_PRO_ANNUAL_PRODUCT_ID;
    delete process.env.POLAR_FAMILY_MONTHLY_PRODUCT_ID;
    delete process.env.POLAR_FAMILY_ANNUAL_PRODUCT_ID;
  });

  it('returns pro monthly product ID', () => {
    expect(getProductId('pro', 'monthly')).toBe('prod_pro_monthly');
  });

  it('returns pro annual product ID', () => {
    expect(getProductId('pro', 'annual')).toBe('prod_pro_annual');
  });

  it('returns family monthly product ID', () => {
    expect(getProductId('family', 'monthly')).toBe('prod_family_monthly');
  });

  it('returns family annual product ID', () => {
    expect(getProductId('family', 'annual')).toBe('prod_family_annual');
  });

  it('returns null for free tier', () => {
    expect(getProductId('free', 'monthly')).toBeNull();
  });

  it('returns null for owner tier', () => {
    expect(getProductId('owner', 'monthly')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPolarTrialDays
// ---------------------------------------------------------------------------
describe('getPolarTrialDays', () => {
  it('returns 14 for pro', () => {
    expect(getPolarTrialDays('pro')).toBe(14);
  });

  it('returns 14 for family', () => {
    expect(getPolarTrialDays('family')).toBe(14);
  });

  it('returns 0 for free', () => {
    expect(getPolarTrialDays('free')).toBe(0);
  });

  it('returns 0 for owner', () => {
    expect(getPolarTrialDays('owner')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getPolarAnnualSavings
// ---------------------------------------------------------------------------
describe('getPolarAnnualSavings', () => {
  it('returns zeros for free tier', () => {
    const result = getPolarAnnualSavings('free');
    expect(result).toEqual({ amount: 0, percentage: 0, monthsFree: 0 });
  });

  it('returns zeros for owner tier', () => {
    const result = getPolarAnnualSavings('owner');
    expect(result).toEqual({ amount: 0, percentage: 0, monthsFree: 0 });
  });

  it('pro savings: amount = monthlyTotal - annualPrice', () => {
    const { price, annualPrice } = POLAR_PLANS.pro;
    const result = getPolarAnnualSavings('pro');
    expect(result.amount).toBe(price * 12 - annualPrice);
  });

  it('pro savings: percentage rounded correctly', () => {
    const { price, annualPrice } = POLAR_PLANS.pro;
    const expectedPct = Math.round(((price * 12 - annualPrice) / (price * 12)) * 100);
    expect(getPolarAnnualSavings('pro').percentage).toBe(expectedPct);
  });

  it('pro savings: months free matches savings / monthly price', () => {
    const { price, annualPrice } = POLAR_PLANS.pro;
    const savings = price * 12 - annualPrice;
    const expectedMonths = Math.round(savings / price);
    expect(getPolarAnnualSavings('pro').monthsFree).toBe(expectedMonths);
  });

  it('family savings are positive', () => {
    const result = getPolarAnnualSavings('family');
    expect(result.amount).toBeGreaterThan(0);
    expect(result.percentage).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// createCheckoutUrl — requires POLAR_ACCESS_TOKEN for client init
// ---------------------------------------------------------------------------
describe('createCheckoutUrl', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.POLAR_ACCESS_TOKEN;
  });

  it('returns null when POLAR_ACCESS_TOKEN is not set', async () => {
    delete process.env.POLAR_ACCESS_TOKEN;
    const result = await createCheckoutUrl('prod_id', 'user@example.com', 'https://app.com/success');
    expect(result).toBeNull();
  });

  it('returns checkout URL on success', async () => {
    process.env.POLAR_ACCESS_TOKEN = 'test-token';
    mockCheckoutsCreate.mockResolvedValueOnce({ id: 'ch_123', url: 'https://checkout.polar.sh/ch_123' });

    const result = await createCheckoutUrl(
      'prod_pro_monthly',
      'user@example.com',
      'https://app.com/success',
      { userId: 'u1' }
    );
    expect(result).toBe('https://checkout.polar.sh/ch_123');
    expect(mockCheckoutsCreate).toHaveBeenCalledWith({
      products: ['prod_pro_monthly'],
      customerEmail: 'user@example.com',
      successUrl: 'https://app.com/success',
      metadata: { userId: 'u1' },
    });
  });

  it('returns null when checkout create throws', async () => {
    process.env.POLAR_ACCESS_TOKEN = 'test-token';
    mockCheckoutsCreate.mockRejectedValueOnce(new Error('API error'));

    const result = await createCheckoutUrl('prod_id', 'user@example.com', 'https://app.com/success');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createCustomerPortalUrl
// ---------------------------------------------------------------------------
describe('createCustomerPortalUrl', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.POLAR_ACCESS_TOKEN;
  });

  it('returns null when POLAR_ACCESS_TOKEN is not set', async () => {
    delete process.env.POLAR_ACCESS_TOKEN;
    const result = await createCustomerPortalUrl('cus_123');
    expect(result).toBeNull();
  });

  it('returns customer portal URL on success', async () => {
    process.env.POLAR_ACCESS_TOKEN = 'test-token';
    mockCustomerSessionsCreate.mockResolvedValueOnce({
      customerPortalUrl: 'https://portal.polar.sh/cus_123',
    });

    const result = await createCustomerPortalUrl('cus_123');
    expect(result).toBe('https://portal.polar.sh/cus_123');
    expect(mockCustomerSessionsCreate).toHaveBeenCalledWith({ customerId: 'cus_123' });
  });

  it('returns null when session create throws', async () => {
    process.env.POLAR_ACCESS_TOKEN = 'test-token';
    mockCustomerSessionsCreate.mockRejectedValueOnce(new Error('API error'));

    const result = await createCustomerPortalUrl('cus_123');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// cancelSubscription
// ---------------------------------------------------------------------------
describe('cancelSubscription', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.POLAR_ACCESS_TOKEN;
  });

  it('returns false when POLAR_ACCESS_TOKEN is not set', async () => {
    delete process.env.POLAR_ACCESS_TOKEN;
    const result = await cancelSubscription('sub_123');
    expect(result).toBe(false);
  });

  it('cancels at period end by default', async () => {
    process.env.POLAR_ACCESS_TOKEN = 'test-token';
    mockSubscriptionsUpdate.mockResolvedValueOnce({ id: 'sub_123', status: 'active' });

    const result = await cancelSubscription('sub_123');
    expect(result).toBe(true);
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith({
      id: 'sub_123',
      cancelAtPeriodEnd: true,
    });
  });

  it('revokes immediately when immediate: true', async () => {
    process.env.POLAR_ACCESS_TOKEN = 'test-token';
    mockSubscriptionsUpdate.mockResolvedValueOnce({ id: 'sub_123', status: 'canceled' });

    const result = await cancelSubscription('sub_123', { immediate: true });
    expect(result).toBe(true);
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith({
      id: 'sub_123',
      revoke: true,
    });
  });

  it('returns false when subscriptions.update throws', async () => {
    process.env.POLAR_ACCESS_TOKEN = 'test-token';
    mockSubscriptionsUpdate.mockRejectedValueOnce(new Error('API error'));

    const result = await cancelSubscription('sub_123');
    expect(result).toBe(false);
  });
});
