import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ccpaService } from '@/lib/services/ccpa-service';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ccpa-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setOptOutStatus', () => {
    it('should set opt-out status for a user', async () => {
      const query = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { user_id: 'user-1', opted_out: true }, error: null }),
      };

      const auditQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ccpa_opt_out_status') return query;
        if (table === 'ccpa_audit_log') return auditQuery;
        return query;
      });

      const result = await ccpaService.setOptOutStatus('user-1', true, {
        ipAddress: '192.168.1.1',
        californiaResident: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(query.upsert).toHaveBeenCalled();
    });

    it('should handle errors when setting opt-out status', async () => {
      const query = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await ccpaService.setOptOutStatus('user-1', true);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getOptOutStatus', () => {
    it('should get opt-out status for a user', async () => {
      const mockStatus = {
        user_id: 'user-1',
        opted_out: true,
        opt_out_date: '2024-01-01T00:00:00Z',
        california_resident: true,
      };

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStatus, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await ccpaService.getOptOutStatus('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return default status for users without records', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await ccpaService.getOptOutStatus('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.opted_out).toBe(false);
    });
  });

  describe('checkCaliforniaResident', () => {
    it('should check if IP is from California', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('CA'),
      });

      const result = await ccpaService.checkCaliforniaResident('1.2.3.4');

      expect(result).toBe(true);
    });

    it('should return false for non-California IPs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('NY'),
      });

      const result = await ccpaService.checkCaliforniaResident('1.2.3.4');

      expect(result).toBe(false);
    });

    it('should default to true on errors (for compliance)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await ccpaService.checkCaliforniaResident('1.2.3.4');

      expect(result).toBe(true);
    });
  });

  describe('getCCPADataPortability', () => {
    it('should export CCPA data for a user', async () => {
      const mockStatus = { user_id: 'user-1', opted_out: true };
      const mockAuditLogs = [{ id: 'log-1', action: 'opt_out_enabled' }];

      const statusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStatus, error: null }),
      };

      const auditQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ccpa_opt_out_status') return statusQuery;
        if (table === 'ccpa_audit_log') return auditQuery;
        return statusQuery;
      });

      const result = await ccpaService.getCCPADataPortability('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.ccpa_opt_out_status).toBeDefined();
      expect(result.data?.ccpa_audit_history).toHaveLength(1);
    });
  });

  describe('logCCPAAction', () => {
    it('should log CCPA actions for audit trail', async () => {
      const query = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      await ccpaService.logCCPAAction('user-1', 'opt_out_enabled', {
        ip_address: '192.168.1.1',
      });

      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          action: 'opt_out_enabled',
        })
      );
    });

    it('should not throw on logging errors', async () => {
      const query = {
        insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      };

      mockSupabase.from.mockReturnValue(query);

      await expect(
        ccpaService.logCCPAAction('user-1', 'opt_out_enabled')
      ).resolves.not.toThrow();
    });
  });

  describe('bulkUpdateCaliforniaResidents', () => {
    it('should update all California residents', async () => {
      const mockUpdated = [
        { user_id: 'user-1', opted_out: true },
        { user_id: 'user-2', opted_out: true },
      ];

      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
      };

      const auditQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ccpa_opt_out_status') return query;
        if (table === 'ccpa_audit_log') return auditQuery;
        return query;
      });

      const result = await ccpaService.bulkUpdateCaliforniaResidents(true, 'admin-1');

      expect(result.success).toBe(true);
      expect(query.update).toHaveBeenCalled();
      expect(query.eq).toHaveBeenCalledWith('california_resident', true);
    });

    it('should handle bulk update errors', async () => {
      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await ccpaService.bulkUpdateCaliforniaResidents(true, 'admin-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
