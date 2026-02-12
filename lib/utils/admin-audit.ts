/**
 * Admin Audit Log Utility
 *
 * Logs admin actions to the admin_audit_log table for compliance tracking.
 * Fire-and-forget — never blocks the request on logging failure.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

interface AuditLogEntry {
  adminUserId: string;
  action: string;
  targetResource?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an admin action to the audit trail.
 * This is fire-and-forget — errors are silently captured, never thrown.
 */
export async function logAdminAction({
  adminUserId,
  action,
  targetResource,
  metadata,
  ipAddress,
}: AuditLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_user_id: adminUserId,
      action,
      target_resource: targetResource ?? null,
      metadata: metadata ?? {},
      ip_address: ipAddress ?? null,
    });
  } catch {
    // Fire-and-forget — audit logging must never break admin operations
  }
}
