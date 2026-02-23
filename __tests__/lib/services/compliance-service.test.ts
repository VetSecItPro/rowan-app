import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPrivacyPreferences,
  updatePrivacyPreferences,
  getCCPAPreference,
  updateCCPAPreference,
  getDataProcessingAgreements,
  recordConsent,
  logComplianceEvent,
  getComplianceEvents,
} from '@/lib/services/compliance-service';

// ── Supabase client mock ──────────────────────────────────────────────────────
function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'rpc', 'range'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const mockClient = { from: vi.fn() };

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn(),
}));

import { csrfFetch } from '@/lib/utils/csrf-fetch';
const mockCsrfFetch = vi.mocked(csrfFetch);

describe('compliance-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getPrivacyPreferences ─────────────────────────────────────────────────
  describe('getPrivacyPreferences', () => {
    it('returns preferences on successful fetch', async () => {
      const mockPrefs = { analytics: true, marketing: false };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockPrefs }),
      } as Response);

      const result = await getPrivacyPreferences('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPrefs);
    });

    it('returns failure when fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Not found' }),
      } as Response);

      const result = await getPrivacyPreferences('user-1');

      expect(result.success).toBe(false);
    });

    it('returns failure on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await getPrivacyPreferences('user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  // ── updatePrivacyPreferences ──────────────────────────────────────────────
  describe('updatePrivacyPreferences', () => {
    it('returns success when update succeeds', async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await updatePrivacyPreferences('user-1', { analytics: false });

      expect(result.success).toBe(true);
    });

    it('returns failure when API returns error', async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Unauthorized' }),
      } as Response);

      const result = await updatePrivacyPreferences('user-1', {});

      expect(result.success).toBe(false);
    });

    it('returns failure on network error', async () => {
      mockCsrfFetch.mockRejectedValue(new Error('Network error'));

      const result = await updatePrivacyPreferences('user-1', {});

      expect(result.success).toBe(false);
    });
  });

  // ── getCCPAPreference ────────────────────────────────────────────────────
  describe('getCCPAPreference', () => {
    it('returns CCPA preference on success', async () => {
      const mockPref = { do_not_sell: true, current_status: 'opted_out', user_id: 'user-1' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockPref }),
      } as Response);

      const result = await getCCPAPreference('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.do_not_sell).toBe(true);
    });

    it('returns failure on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('error'));

      const result = await getCCPAPreference('user-1');

      expect(result.success).toBe(false);
    });
  });

  // ── updateCCPAPreference ──────────────────────────────────────────────────
  describe('updateCCPAPreference', () => {
    it('returns success when opt-out succeeds', async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await updateCCPAPreference('user-1', true);

      expect(result.success).toBe(true);
    });

    it('returns failure on API error', async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Error' }),
      } as Response);

      const result = await updateCCPAPreference('user-1', false);

      expect(result.success).toBe(false);
    });
  });

  // ── getDataProcessingAgreements ───────────────────────────────────────────
  describe('getDataProcessingAgreements', () => {
    it('returns agreements array on success', async () => {
      const agreements = [{ id: 'agr-1', user_id: 'user-1', agreement_type: 'tos', agreement_version: '1.0', legal_basis: 'consent', consented: true, withdrawn: false }];
      const chain = createChainMock({ data: agreements, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getDataProcessingAgreements('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('returns failure on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getDataProcessingAgreements('user-1');

      expect(result.success).toBe(false);
    });
  });

  // ── recordConsent ─────────────────────────────────────────────────────────
  describe('recordConsent', () => {
    it('returns success when consent is recorded', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        // First call: insert agreement; second call: log compliance event
        return createChainMock({ error: null });
      });

      const result = await recordConsent('user-1', 'tos', '2.0', 'consent');

      expect(result.success).toBe(true);
    });

    it('returns failure when insert fails', async () => {
      const chain = createChainMock({ error: { message: 'Constraint violation' } });
      mockClient.from.mockReturnValue(chain);

      const result = await recordConsent('user-1', 'tos', '2.0', 'consent');

      expect(result.success).toBe(false);
    });
  });

  // ── logComplianceEvent ────────────────────────────────────────────────────
  describe('logComplianceEvent', () => {
    it('returns success on insert', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await logComplianceEvent({
        user_id: 'user-1',
        event_type: 'consent_given',
        event_category: 'gdpr',
      });

      expect(result.success).toBe(true);
    });

    it('returns failure on DB error', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await logComplianceEvent({
        user_id: 'user-1',
        event_type: 'test',
        event_category: 'general_privacy',
      });

      expect(result.success).toBe(false);
    });
  });

  // ── getComplianceEvents ───────────────────────────────────────────────────
  describe('getComplianceEvents', () => {
    it('returns events for a user', async () => {
      const events = [{ id: 'ev-1', user_id: 'user-1', event_type: 'login', event_category: 'general_privacy' }];
      const chain = createChainMock({ data: events, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getComplianceEvents('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('applies category filter', async () => {
      const chain = createChainMock({ data: [], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getComplianceEvents('user-1', { category: 'gdpr', limit: 5 });

      expect(result.success).toBe(true);
    });

    it('returns failure on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getComplianceEvents('user-1');

      expect(result.success).toBe(false);
    });
  });
});
