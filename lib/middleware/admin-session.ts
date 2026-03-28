import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSessionData, validateSessionData, encryptSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger-edge';
import type { AuthSession } from './auth';

/** Admin session duration in seconds (24 hours) - must match login route */
const ADMIN_SESSION_DURATION = 24 * 60 * 60;

interface AdminSessionData {
  expiresAt: number;
  adminId: string;
  email: string;
  role?: string;
  permissions?: string[];
  authUserId?: string;
  loginTime?: number;
}

type AdminRpcResult = { data: unknown; error: { code: string; message: string } | null };
type AdminRpcRow = { admin_id: string; email: string; role: string; permissions: string[] };

/**
 * Handles all admin path logic: login redirect, session cookie validation/refresh,
 * SSO via Supabase RPC, and adding x-admin-verified headers.
 *
 * @param supabaseRpc - Callback that calls supabase.rpc('get_admin_details')
 * @returns A NextResponse to send immediately, or null if path is not an admin path.
 */
export async function handleAdminPath(
  req: NextRequest,
  session: AuthSession | null,
  response: NextResponse,
  supabaseRpc: () => PromiseLike<AdminRpcResult>,
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;

  const isAdminPagePath = pathname.startsWith('/admin');
  const isAdminApiPath = pathname.startsWith('/api/admin');
  if (!isAdminPagePath && !isAdminApiPath) return null;

  // Redirect old admin login page to regular login
  if (pathname === '/admin/login') {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', '/admin/dashboard');
    return NextResponse.redirect(redirectUrl);
  }

  // Check for existing valid admin-session cookie
  const adminSessionCookie = req.cookies.get('admin-session')?.value;
  if (adminSessionCookie) {
    try {
      const sessionData = await decryptSessionData(adminSessionCookie);
      if (validateSessionData(sessionData)) {
        const typedSession = sessionData as AdminSessionData;
        // Refresh cookie if within 30 min of expiration
        if (typedSession.expiresAt - Date.now() < 30 * 60 * 1000) {
          const newPayload = await encryptSessionData({
            ...typedSession,
            expiresAt: Date.now() + ADMIN_SESSION_DURATION * 1000,
          });
          response.cookies.set('admin-session', newPayload, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: ADMIN_SESSION_DURATION,
            path: '/',
          });
        }
        if (isAdminApiPath) {
          response.headers.set('x-admin-verified', 'true');
          response.headers.set('x-admin-id', typedSession.adminId);
        }
        return response;
      }
    } catch {
      // Invalid cookie — fall through to SSO
    }
  }

  // No valid admin session — require regular auth first
  if (!session) {
    if (isAdminApiPath) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Logged in — verify admin status via RPC
  try {
    const { data: adminData, error: adminError } = await supabaseRpc();

    if (adminError) {
      logger.error('Admin RPC error', adminError, {
        component: 'middleware/admin-session',
        action: 'admin_rpc_check',
        path: pathname,
        errorCode: adminError.code,
        errorMessage: adminError.message,
      });
      if (isAdminApiPath) {
        return NextResponse.json({ error: 'Admin verification failed' }, { status: 500 });
      }
      const redirectUrl = new URL('/dashboard', req.url);
      redirectUrl.searchParams.set('error', 'admin_rpc_error');
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.delete('admin-session');
      return res;
    }

    if (!Array.isArray(adminData) || adminData.length === 0) {
      if (isAdminApiPath) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      const redirectUrl = new URL('/dashboard', req.url);
      redirectUrl.searchParams.set('error', 'admin_required');
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.delete('admin-session');
      return res;
    }

    // Admin confirmed — create session cookie
    const adminRows = adminData as AdminRpcRow[];
    const admin = adminRows[0];
    const newSession: AdminSessionData = {
      adminId: admin.admin_id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      authUserId: session.user.id,
      loginTime: Date.now(),
      expiresAt: Date.now() + ADMIN_SESSION_DURATION * 1000,
    };
    const sessionPayload = await encryptSessionData(newSession);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: ADMIN_SESSION_DURATION,
      path: '/',
    };

    if (isAdminApiPath) {
      response.cookies.set('admin-session', sessionPayload, cookieOptions);
      response.headers.set('x-admin-verified', 'true');
      response.headers.set('x-admin-id', admin.admin_id);
      return response;
    }

    // Page route: redirect to pick up the new cookie
    const res = NextResponse.redirect(new URL(pathname, req.url));
    res.cookies.set('admin-session', sessionPayload, cookieOptions);
    return res;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin SSO check failed', error, {
      component: 'middleware/admin-session',
      action: 'admin_sso_check',
      path: pathname,
      errorMessage,
    });
    if (isAdminApiPath) {
      return NextResponse.json({ error: 'Admin authentication error' }, { status: 500 });
    }
    const redirectUrl = new URL('/dashboard', req.url);
    const actualError = errorMessage.includes(': ')
      ? errorMessage.split(': ').pop() ?? ''
      : errorMessage;
    const sanitizedError = actualError
      .substring(0, 50)
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .replace(/\s+/g, '_');
    redirectUrl.searchParams.set('error', `admin_err_${sanitizedError}`);
    return NextResponse.redirect(redirectUrl);
  }
}
