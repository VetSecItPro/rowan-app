import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * User Audit Log Service
 *
 * GDPR COMPLIANCE:
 * ----------------
 * - Article 15: Right of Access - Users can view their audit trail
 * - Article 5: Accountability - Transparent logging of data processing
 *
 * PURPOSE:
 * --------
 * Tracks all user data access and account actions for:
 * - GDPR compliance and transparency
 * - Security monitoring and breach detection
 * - User accountability and activity tracking
 *
 * RETENTION:
 * ----------
 * - Audit logs retained for 2 years
 * - Automatically cleaned up via monthly cron job
 * - Immutable once created (compliance requirement)
 */

export type ActionCategory = 'data_access' | 'account' | 'security' | 'compliance';

export interface AuditLogEntry {
  id?: string;
  user_id: string;
  action: string;
  action_category: ActionCategory;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  details?: Record<string, any>;
  timestamp?: string;
  created_at?: string;
}

export interface LogAuditResult {
  success: boolean;
  error?: string;
}

/**
 * Log a user audit event
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'created_at'>): Promise<LogAuditResult> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('user_audit_log')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        action_category: entry.action_category,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        location: entry.location,
        details: entry.details,
      });

    if (error) {
      logger.error('Error logging audit event:', error, { component: 'lib-audit-log-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error logging audit event:', error, { component: 'lib-audit-log-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to log audit event',
    };
  }
}

/**
 * Get audit log entries for a user
 */
export async function getUserAuditLog(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    category?: ActionCategory;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ success: boolean; data?: AuditLogEntry[]; total?: number; error?: string }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('user_audit_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    // Apply filters
    if (options?.category) {
      query = query.eq('action_category', options.category);
    }

    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate);
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching audit log:', error, { component: 'lib-audit-log-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, data: data as AuditLogEntry[], total: count || 0 };
  } catch (error) {
    logger.error('Error fetching audit log:', error, { component: 'lib-audit-log-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit log',
    };
  }
}

/**
 * Get audit log statistics for a user
 */
export async function getUserAuditStats(userId: string): Promise<{
  success: boolean;
  stats?: {
    total: number;
    by_category: Record<ActionCategory, number>;
    recent_actions: number; // Last 30 days
    most_common_action: string;
  };
  error?: string;
}> {
  try {
    const supabase = createClient();

    // Get total count
    const { count: total } = await supabase
      .from('user_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get count by category
    const categories: ActionCategory[] = ['data_access', 'account', 'security', 'compliance'];
    const by_category: Record<ActionCategory, number> = {
      data_access: 0,
      account: 0,
      security: 0,
      compliance: 0,
    };

    for (const category of categories) {
      const { count } = await supabase
        .from('user_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_category', category);

      by_category[category] = count || 0;
    }

    // Get recent actions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recent_actions } = await supabase
      .from('user_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('timestamp', thirtyDaysAgo.toISOString());

    // Get most common action
    const { data: actions } = await supabase
      .from('user_audit_log')
      .select('action')
      .eq('user_id', userId);

    const actionCounts: Record<string, number> = {};
    (actions || []).forEach((entry: any) => {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
    });

    const most_common_action = Object.keys(actionCounts).reduce((a, b) =>
      actionCounts[a] > actionCounts[b] ? a : b
    , Object.keys(actionCounts)[0] || 'none');

    return {
      success: true,
      stats: {
        total: total || 0,
        by_category,
        recent_actions: recent_actions || 0,
        most_common_action,
      },
    };
  } catch (error) {
    logger.error('Error fetching audit stats:', error, { component: 'lib-audit-log-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit stats',
    };
  }
}

/**
 * Helper functions for common audit events
 */

export async function logDataExport(userId: string, format: 'json' | 'csv', dataType?: string) {
  return logAuditEvent({
    user_id: userId,
    action: 'data_export',
    action_category: 'data_access',
    resource_type: 'user_data',
    details: { format, dataType },
  });
}

export async function logAccountLogin(userId: string, ipAddress?: string, userAgent?: string) {
  return logAuditEvent({
    user_id: userId,
    action: 'account_login',
    action_category: 'account',
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

export async function logAccountLogout(userId: string) {
  return logAuditEvent({
    user_id: userId,
    action: 'account_logout',
    action_category: 'account',
  });
}

export async function logPasswordChange(userId: string) {
  return logAuditEvent({
    user_id: userId,
    action: 'password_change',
    action_category: 'security',
  });
}

export async function logEmailChange(userId: string, newEmail: string) {
  return logAuditEvent({
    user_id: userId,
    action: 'email_change',
    action_category: 'security',
    details: { new_email: newEmail },
  });
}

export async function log2FAEnable(userId: string) {
  return logAuditEvent({
    user_id: userId,
    action: '2fa_enable',
    action_category: 'security',
  });
}

export async function log2FADisable(userId: string) {
  return logAuditEvent({
    user_id: userId,
    action: '2fa_disable',
    action_category: 'security',
  });
}

export async function logDeletionInitiated(userId: string) {
  return logAuditEvent({
    user_id: userId,
    action: 'deletion_initiated',
    action_category: 'compliance',
    details: { gdpr_article: 17, right: 'Right to Erasure' },
  });
}

export async function logDeletionCancelled(userId: string) {
  return logAuditEvent({
    user_id: userId,
    action: 'deletion_cancelled',
    action_category: 'compliance',
  });
}

export async function logProfileView(userId: string) {
  return logAuditEvent({
    user_id: userId,
    action: 'profile_view',
    action_category: 'data_access',
    resource_type: 'profile',
  });
}

export async function logProfileUpdate(userId: string, fields: string[]) {
  return logAuditEvent({
    user_id: userId,
    action: 'profile_update',
    action_category: 'data_access',
    resource_type: 'profile',
    details: { updated_fields: fields },
  });
}
