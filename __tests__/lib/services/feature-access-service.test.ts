import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canAccessFeature,
  canPerformUsageAction,
  canUseNumericFeature,
  getUserFeatureAccess,
  shouldPromptUpgrade,
  getLimitWarnings,
} from '@/lib/services/feature-access-service';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Use vi.hoisted so mock fns are available inside vi.mock factories
const { mockGetUserTier, mockGetFeatureLimits, mockCanPerformAction, mockGetTodayUsage } = vi.hoisted(() => ({
  mockGetUserTier: vi.fn(),
  mockGetFeatureLimits: vi.fn(),
  mockCanPerformAction: vi.fn(),
  mockGetTodayUsage: vi.fn(),
}));

vi.mock('@/lib/services/subscription-service', () => ({
  getUserTier: mockGetUserTier,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/config/feature-limits', () => ({
  getFeatureLimits: mockGetFeatureLimits,
}));

vi.mock('@/lib/services/usage-service', () => ({
  canPerformAction: mockCanPerformAction,
  getTodayUsage: mockGetTodayUsage,
}));

const FREE_LIMITS = {
  canUploadPhotos: false,
  canUseMealPlanning: false,
  canUseReminders: false,
  canUseGoals: false,
  canUseHousehold: false,
  canUseAI: false,
  canUseIntegrations: false,
  canUseEventProposals: false,
  maxActiveTasks: 20,
  maxShoppingLists: 3,
  maxShoppingItems: 50,
  maxUsers: 2,
  maxSpaces: 1,
  storageGB: undefined,
  dailyTaskCreation: 10,
  dailyMessages: 20,
  dailyShoppingUpdates: 10,
  dailyQuickActions: 5,
};

const PRO_LIMITS = {
  ...FREE_LIMITS,
  canUploadPhotos: true,
  canUseMealPlanning: true,
  canUseReminders: true,
  canUseGoals: true,
  canUseHousehold: true,
  canUseAI: true,
  canUseEventProposals: true,
  maxActiveTasks: -1,
  dailyTaskCreation: -1,
  dailyMessages: -1,
  dailyShoppingUpdates: -1,
  dailyQuickActions: -1,
};

describe('feature-access-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── canAccessFeature ──────────────────────────────────────────────────────
  describe('canAccessFeature', () => {
    it('allows access when tier has the feature', async () => {
      mockGetUserTier.mockResolvedValue('pro');
      mockGetFeatureLimits.mockReturnValue(PRO_LIMITS);

      const result = await canAccessFeature('user-1', 'canUseGoals');

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('pro');
    });

    it('denies access for free tier feature', async () => {
      mockGetUserTier.mockResolvedValue('free');
      mockGetFeatureLimits.mockReturnValue(FREE_LIMITS);

      const result = await canAccessFeature('user-1', 'canUseGoals');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Pro');
    });

    it('returns family tier requirement for integrations', async () => {
      mockGetUserTier.mockResolvedValue('pro');
      mockGetFeatureLimits.mockReturnValue({ ...PRO_LIMITS, canUseIntegrations: false });

      const result = await canAccessFeature('user-1', 'canUseIntegrations');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Family');
    });
  });

  // ── canPerformUsageAction ─────────────────────────────────────────────────
  describe('canPerformUsageAction', () => {
    it('returns allowed with tier when action is permitted', async () => {
      mockGetUserTier.mockResolvedValue('pro');
      mockCanPerformAction.mockResolvedValue({ allowed: true, currentUsage: 5, limit: -1 });

      const result = await canPerformUsageAction('user-1', 'tasks_created');

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('pro');
    });

    it('returns not allowed when usage is at limit', async () => {
      mockGetUserTier.mockResolvedValue('free');
      mockCanPerformAction.mockResolvedValue({ allowed: false, currentUsage: 10, limit: 10 });

      const result = await canPerformUsageAction('user-1', 'tasks_created');

      expect(result.allowed).toBe(false);
    });
  });

  // ── canUseNumericFeature ──────────────────────────────────────────────────
  describe('canUseNumericFeature', () => {
    it('allows when count is below limit', async () => {
      mockGetUserTier.mockResolvedValue('free');
      mockGetFeatureLimits.mockReturnValue(FREE_LIMITS);

      const result = await canUseNumericFeature('user-1', 'maxActiveTasks', 10);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(20);
    });

    it('denies when count meets limit', async () => {
      mockGetUserTier.mockResolvedValue('free');
      mockGetFeatureLimits.mockReturnValue(FREE_LIMITS);

      const result = await canUseNumericFeature('user-1', 'maxActiveTasks', 20);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Limit reached');
    });

    it('always allows when limit is -1 (unlimited)', async () => {
      mockGetUserTier.mockResolvedValue('pro');
      mockGetFeatureLimits.mockReturnValue(PRO_LIMITS);

      const result = await canUseNumericFeature('user-1', 'maxActiveTasks', 999);

      expect(result.allowed).toBe(true);
    });
  });

  // ── getUserFeatureAccess ──────────────────────────────────────────────────
  describe('getUserFeatureAccess', () => {
    it('returns comprehensive feature access summary', async () => {
      mockGetUserTier.mockResolvedValue('pro');
      mockGetFeatureLimits.mockReturnValue(PRO_LIMITS);
      mockGetTodayUsage.mockResolvedValue(5);

      const result = await getUserFeatureAccess('user-1');

      expect(result.tier).toBe('pro');
      expect(result.features).toBeDefined();
      expect(result.limits).toBeDefined();
      expect(result.dailyUsage).toBeDefined();
      expect(result.features.goals).toBe(true);
      expect(result.dailyUsage.taskCreation.current).toBe(5);
    });

    it('shows unlimited remaining for -1 limits', async () => {
      mockGetUserTier.mockResolvedValue('pro');
      mockGetFeatureLimits.mockReturnValue(PRO_LIMITS);
      mockGetTodayUsage.mockResolvedValue(10);

      const result = await getUserFeatureAccess('user-1');

      // Pro limits are -1 (unlimited)
      expect(result.dailyUsage.taskCreation.remaining).toBe(-1);
    });
  });

  // ── shouldPromptUpgrade ───────────────────────────────────────────────────
  describe('shouldPromptUpgrade', () => {
    it('returns shouldPrompt false for free user with free-accessible feature', async () => {
      mockGetUserTier.mockResolvedValue('free');

      const result = await shouldPromptUpgrade('user-1', 'unknownFeature');

      expect(result.shouldPrompt).toBe(false);
    });

    it('returns shouldPrompt true for free user needing pro feature', async () => {
      mockGetUserTier.mockResolvedValue('free');

      const result = await shouldPromptUpgrade('user-1', 'goals');

      expect(result.shouldPrompt).toBe(true);
      expect(result.requiredTier).toBe('pro');
      expect(result.reason).toBeDefined();
    });

    it('returns shouldPrompt false for pro user with pro feature', async () => {
      mockGetUserTier.mockResolvedValue('pro');

      const result = await shouldPromptUpgrade('user-1', 'goals');

      expect(result.shouldPrompt).toBe(false);
    });

    it('returns shouldPrompt true for pro user needing family feature', async () => {
      mockGetUserTier.mockResolvedValue('pro');

      const result = await shouldPromptUpgrade('user-1', 'integrations');

      expect(result.shouldPrompt).toBe(true);
      expect(result.requiredTier).toBe('family');
    });
  });

  // ── getLimitWarnings ──────────────────────────────────────────────────────
  describe('getLimitWarnings', () => {
    it('returns warnings when usage is above threshold', async () => {
      mockGetUserTier.mockResolvedValue('free');
      mockGetFeatureLimits.mockReturnValue(FREE_LIMITS);
      // Usage is 9/10 = 90% for task creation - above 80% threshold
      mockGetTodayUsage.mockResolvedValue(9);

      const result = await getLimitWarnings('user-1', 0.8);

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe('usage');
    });

    it('returns no warnings when usage is below threshold', async () => {
      mockGetUserTier.mockResolvedValue('free');
      mockGetFeatureLimits.mockReturnValue(FREE_LIMITS);
      // Usage is 1/10 = 10% - below threshold
      mockGetTodayUsage.mockResolvedValue(1);

      const result = await getLimitWarnings('user-1', 0.8);

      expect(result.hasWarnings).toBe(false);
    });

    it('skips unlimited (-1) limits', async () => {
      mockGetUserTier.mockResolvedValue('pro');
      mockGetFeatureLimits.mockReturnValue(PRO_LIMITS);
      mockGetTodayUsage.mockResolvedValue(1000);

      const result = await getLimitWarnings('user-1', 0.8);

      expect(result.hasWarnings).toBe(false);
    });
  });
});
