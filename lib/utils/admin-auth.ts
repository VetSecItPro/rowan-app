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
 */

import { NextRequest } from 'next/server';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';

export interface AdminAuthResult {
  isValid: boolean;
  adminId?: string;
  error?: string;
}

/**
 * Verify admin authentication for an API route
 *
 * Checks in order:
 * 1. x-admin-verified header (set by middleware for SSO first-request)
 * 2. admin-session cookie (for subsequent requests)
 *
 * @param request - The NextRequest object
 * @returns AdminAuthResult with isValid status
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  // Check 1: Middleware-set header (takes priority - freshly verified)
  const adminVerified = request.headers.get('x-admin-verified');
  const adminIdFromHeader = request.headers.get('x-admin-id');

  if (adminVerified === 'true' && adminIdFromHeader) {
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
