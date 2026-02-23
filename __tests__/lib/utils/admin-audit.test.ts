/**
 * Unit tests for lib/utils/admin-audit.ts
 *
 * Tests the fire-and-forget audit logging utility that writes
 * admin actions to the admin_audit_log table.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.hoisted ensures variables are available when the
// vi.mock factory runs (factories are hoisted above imports by Vitest).
// ---------------------------------------------------------------------------

const { mockInsert, mockFrom } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  return { mockInsert, mockFrom };
});

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

import { logAdminAction } from '@/lib/utils/admin-audit';

describe('logAdminAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it('should call supabaseAdmin.from with admin_audit_log', async () => {
    await logAdminAction({
      adminUserId: 'admin-123',
      action: 'USER_SUSPENDED',
    });

    expect(mockFrom).toHaveBeenCalledWith('admin_audit_log');
  });

  it('should insert a record with all fields mapped to snake_case columns', async () => {
    await logAdminAction({
      adminUserId: 'admin-456',
      action: 'SUBSCRIPTION_CANCELLED',
      targetResource: 'user/789',
      metadata: { reason: 'non-payment' },
      ipAddress: '127.0.0.1',
    });

    expect(mockInsert).toHaveBeenCalledWith({
      admin_user_id: 'admin-456',
      action: 'SUBSCRIPTION_CANCELLED',
      target_resource: 'user/789',
      metadata: { reason: 'non-payment' },
      ip_address: '127.0.0.1',
    });
  });

  it('should default target_resource to null when not provided', async () => {
    await logAdminAction({ adminUserId: 'admin-123', action: 'LOGIN' });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ target_resource: null })
    );
  });

  it('should default ip_address to null when not provided', async () => {
    await logAdminAction({ adminUserId: 'admin-123', action: 'LOGIN' });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ ip_address: null })
    );
  });

  it('should default metadata to empty object when not provided', async () => {
    await logAdminAction({ adminUserId: 'admin-123', action: 'LOGIN' });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} })
    );
  });

  it('should NOT throw when the database insert rejects (fire-and-forget)', async () => {
    mockInsert.mockRejectedValue(new Error('DB connection lost'));

    await expect(
      logAdminAction({ adminUserId: 'admin-123', action: 'FAILED_ACTION' })
    ).resolves.toBeUndefined();
  });

  it('should NOT throw when supabaseAdmin.from throws synchronously', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error('Supabase client error');
    });

    await expect(
      logAdminAction({ adminUserId: 'admin-123', action: 'BOOM' })
    ).resolves.toBeUndefined();
  });

  it('should pass rich metadata objects through unchanged', async () => {
    const metadata = {
      previousTier: 'pro',
      newTier: 'free',
      effectiveDate: '2026-02-22',
      items: [1, 2, 3],
    };

    await logAdminAction({
      adminUserId: 'admin-789',
      action: 'TIER_CHANGE',
      metadata,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata })
    );
  });

  it('should always resolve to undefined (void return type)', async () => {
    const result = await logAdminAction({
      adminUserId: 'admin-123',
      action: 'VIEW_USERS',
    });

    expect(result).toBeUndefined();
  });
});
