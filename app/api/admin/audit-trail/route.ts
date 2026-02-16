/**
 * Audit Trail API Route
 * GET /api/admin/audit-trail - Get unified audit log
 *
 * Merges data from:
 * - admin_audit_log (admin actions)
 * - subscription_events (subscription changes)
 * - Recent user signups (from Supabase Auth)
 *
 * Supports pagination, filtering by action, date range, and text search.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface AuditEntry {
  id: string;
  timestamp: string;
  category: 'admin' | 'subscription' | 'signup';
  actor: string;
  action: string;
  target: string;
  metadata: Record<string, unknown> | null;
}

interface AuditTrailResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify admin authentication
    const auth = await verifyAdminAuth(request);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const actionFilter = searchParams.get('action') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const search = searchParams.get('search') || undefined;

    const cacheFilterKey = [
      actionFilter || 'all',
      dateFrom || '',
      dateTo || '',
      search || '',
    ].join(':');

    const auditTrail = await withCache<AuditTrailResponse>(
      ADMIN_CACHE_KEYS.auditTrail(page, cacheFilterKey),
      async () => {
        // ─── 1. Fetch admin audit log entries ─────────────────────────

        let auditQuery = supabaseAdmin
          .from('admin_audit_log')
          .select('id, admin_user_id, action, target_resource, metadata, ip_address, created_at');

        if (dateFrom) {
          auditQuery = auditQuery.gte('created_at', dateFrom);
        }
        if (dateTo) {
          auditQuery = auditQuery.lte('created_at', dateTo);
        }
        if (actionFilter) {
          auditQuery = auditQuery.ilike('action', `%${actionFilter}%`);
        }
        if (search) {
          auditQuery = auditQuery.or(
            `action.ilike.%${search}%,target_resource.ilike.%${search}%`
          );
        }

        const { data: auditLogs, error: auditError } = await auditQuery
          .order('created_at', { ascending: false })
          .limit(500);

        if (auditError) {
          logger.error('Error fetching admin audit log:', auditError, { component: 'api-route', action: 'api_request' });
        }

        // ─── 2. Fetch subscription events ─────────────────────────────

        let subQuery = supabaseAdmin
          .from('subscription_events')
          .select('id, user_id, event_type, from_tier, to_tier, trigger_source, metadata, created_at');

        if (dateFrom) {
          subQuery = subQuery.gte('created_at', dateFrom);
        }
        if (dateTo) {
          subQuery = subQuery.lte('created_at', dateTo);
        }
        if (actionFilter) {
          subQuery = subQuery.ilike('event_type', `%${actionFilter}%`);
        }
        if (search) {
          subQuery = subQuery.or(
            `event_type.ilike.%${search}%,from_tier.ilike.%${search}%,to_tier.ilike.%${search}%`
          );
        }

        const { data: subEvents, error: subError } = await subQuery
          .order('created_at', { ascending: false })
          .limit(500);

        if (subError) {
          logger.error('Error fetching subscription events:', subError, { component: 'api-route', action: 'api_request' });
        }

        // ─── 3. Fetch recent user signups ─────────────────────────────

        let signupEntries: AuditEntry[] = [];

        // Only fetch signups if no action filter or if filter matches "signup"
        const shouldFetchSignups = !actionFilter || 'signup'.includes(actionFilter.toLowerCase());

        if (shouldFetchSignups) {
          try {
            const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 200,
            });

            if (authData?.users) {
              let signupUsers = authData.users;

              // Apply date filters
              if (dateFrom) {
                signupUsers = signupUsers.filter(
                  (u) => new Date(u.created_at) >= new Date(dateFrom)
                );
              }
              if (dateTo) {
                signupUsers = signupUsers.filter(
                  (u) => new Date(u.created_at) <= new Date(dateTo)
                );
              }
              if (search) {
                const searchLower = search.toLowerCase();
                signupUsers = signupUsers.filter(
                  (u) => (u.email || '').toLowerCase().includes(searchLower)
                );
              }

              signupEntries = signupUsers.map((user) => ({
                id: `signup-${user.id}`,
                timestamp: user.created_at,
                category: 'signup' as const,
                actor: user.email || user.id,
                action: 'user_signup',
                target: user.email || 'unknown',
                metadata: {
                  provider: user.app_metadata?.provider || 'email',
                  confirmed: !!user.email_confirmed_at,
                },
              }));
            }
          } catch (signupError) {
            logger.error('Error fetching user signups for audit trail:', signupError, { component: 'api-route', action: 'api_request' });
          }
        }

        // ─── 4. Merge all entries ─────────────────────────────────────

        const allEntries: AuditEntry[] = [];

        // Map admin audit logs
        if (auditLogs) {
          for (const log of auditLogs) {
            allEntries.push({
              id: log.id,
              timestamp: log.created_at,
              category: 'admin',
              actor: log.admin_user_id || 'system',
              action: log.action,
              target: log.target_resource || '',
              metadata: log.metadata as Record<string, unknown> | null,
            });
          }
        }

        // Map subscription events
        if (subEvents) {
          for (const event of subEvents) {
            const tierChange = event.from_tier && event.to_tier
              ? `${event.from_tier} -> ${event.to_tier}`
              : event.to_tier || '';

            allEntries.push({
              id: event.id,
              timestamp: event.created_at,
              category: 'subscription',
              actor: event.user_id || 'unknown',
              action: event.event_type,
              target: tierChange,
              metadata: {
                ...(event.metadata as Record<string, unknown> || {}),
                trigger_source: event.trigger_source,
                from_tier: event.from_tier,
                to_tier: event.to_tier,
              },
            });
          }
        }

        // Add signup entries
        allEntries.push(...signupEntries);

        // Sort all entries by timestamp descending
        allEntries.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Paginate
        const total = allEntries.length;
        const startIndex = (page - 1) * limit;
        const paginatedEntries = allEntries.slice(startIndex, startIndex + limit);
        const hasMore = startIndex + limit < total;

        return {
          entries: paginatedEntries,
          total,
          page,
          limit,
          hasMore,
        };
      },
      { ttl: ADMIN_CACHE_TTL.auditTrail }
    );

    return NextResponse.json({
      success: true,
      auditTrail,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/audit-trail',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/audit-trail GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    );
  }
}
