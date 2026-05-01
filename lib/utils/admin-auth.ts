/**
 * Admin Authentication Utilities for API Routes
 *
 * Provides helper functions to verify admin access in API routes.
 * Works in conjunction with middleware which sets:
 * 1. admin-session cookie (for subsequent requests)
 * 2. x-admin-verified header (for immediate verification on same request)
 *
 * SECURITY: The x-admin-verified header can only be set by middleware
 * because Next.js middleware runs before the API route and controls headers.
 * Client requests cannot spoof this header as they don't go through middleware setting.
 *
 * SECURITY (is_active recheck): The encrypted admin-session cookie is valid
 * for 24h. If an admin is deactivated (`admin_users.is_active = false`)
 * mid-session, the cookie alone would still be honored. Every call to
 * `verifyAdminAuth` therefore re-checks `admin_users.is_active` from the
 * database. A 60-second in-memory cache absorbs the per-request DB hit on
 * hot dashboards while keeping the revocation window short. Cache is
 * memory-only — it dies with the serverless instance, which is the right
 * behavior for least-privilege.
 */

import { NextRequest } from 'next/server';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AdminAuthResult {
  isValid: boolean;
  adminId?: string;
  error?: string;
}

// 60s TTL keeps the revocation window short while sparing the DB on hot
// admin dashboards. Map<adminId, { active, expiresAt }>.
const IS_ACTIVE_CACHE_TTL_MS = 60_000;
const isActiveCache = new Map<string, { active: boolean; expiresAt: number }>();

async function isAdminStillActive(adminId: string): Promise<boolean> {
  const cached = isActiveCache.get(adminId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.active;
  }

  // nosemgrep: supabase-missing-space-id-filter — admin_users is a global table with no space_id column
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('is_active')
    .eq('id', adminId)
    .maybeSingle();

  // On DB error, fail CLOSED (treat as inactive) so a transient outage can't
  // bypass deactivation. The middleware will return 401 and the operator
  // re-logs in once the DB is back.
  if (error || !data) {
    isActiveCache.set(adminId, { active: false, expiresAt: now + IS_ACTIVE_CACHE_TTL_MS });
    return false;
  }

  const active = data.is_active === true;
  isActiveCache.set(adminId, { active, expiresAt: now + IS_ACTIVE_CACHE_TTL_MS });
  return active;
}

/**
 * Verify admin authentication for an API route
 *
 * Checks in order:
 * 1. x-admin-verified header (set by middleware for SSO first-request)
 * 2. admin-session cookie (for subsequent requests)
 * 3. admin_users.is_active still true (cached 60s)
 *
 * @param request - The NextRequest object
 * @returns AdminAuthResult with isValid status
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  // Check 1: Middleware-set header (takes priority - freshly verified)
  const adminVerified = request.headers.get('x-admin-verified');
  const adminIdFromHeader = request.headers.get('x-admin-id');

  if (adminVerified === 'true' && adminIdFromHeader) {
    if (!(await isAdminStillActive(adminIdFromHeader))) {
      return { isValid: false, error: 'Admin account deactivated' };
    }
    return {
      isValid: true,
      adminId: adminIdFromHeader,
    };
  }

  // Check 2: Admin session cookie
  try {
    const cookieStore = await safeCookiesAsync();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession?.value) {
      return {
        isValid: false,
        error: 'Admin authentication required',
      };
    }

    // Decrypt and validate
    const sessionData = await decryptSessionData(adminSession.value);
    if (!validateSessionData(sessionData)) {
      return {
        isValid: false,
        error: 'Session expired or invalid',
      };
    }

    const typedSession = sessionData as { adminId: string };

    if (!(await isAdminStillActive(typedSession.adminId))) {
      return { isValid: false, error: 'Admin account deactivated' };
    }

    return {
      isValid: true,
      adminId: typedSession.adminId,
    };
  } catch {
    return {
      isValid: false,
      error: 'Invalid session',
    };
  }
}

/**
 * Higher-order function to wrap API route handlers with admin auth
 *
 * @example
 * export const GET = withAdminAuth(async (request, adminId) => {
 *   // Your authenticated handler logic
 *   return NextResponse.json({ adminId });
 * });
 */
export function withAdminAuth(
  handler: (request: NextRequest, adminId: string) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const auth = await verifyAdminAuth(request);

    if (!auth.isValid) {
      return Response.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    return handler(request, auth.adminId!);
  };
}
