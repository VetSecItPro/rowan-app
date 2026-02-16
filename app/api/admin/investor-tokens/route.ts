/**
 * Investor Summary Tokens API Route
 * GET /api/admin/investor-tokens - List all tokens
 * POST /api/admin/investor-tokens - Generate a new token
 * DELETE /api/admin/investor-tokens?id=<token_id> - Revoke a token
 *
 * Admin-only endpoints for managing investor summary access tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import crypto from 'crypto';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/investor-tokens
 * List all investor summary tokens (for admin management)
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Admin auth
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Fetch all tokens
    const { data: tokens, error } = await supabaseAdmin
      .from('investor_summary_tokens')
      .select('id, token, label, expires_at, created_by, last_accessed, access_count, is_revoked, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch investor tokens:', error, {
        component: 'api-route',
        action: 'api_request',
      });
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tokens: tokens || [] });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/investor-tokens', method: 'GET' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/admin/investor-tokens GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/investor-tokens
 * Generate a new investor summary token
 * Body: { label?: string, expiryDays: number }
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Admin auth
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { label, expiryDays } = body;

    if (!expiryDays || typeof expiryDays !== 'number' || expiryDays <= 0) {
      return NextResponse.json(
        { error: 'Invalid expiryDays. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Insert token into database
    const { data: newToken, error } = await supabaseAdmin
      .from('investor_summary_tokens')
      .insert({
        token,
        label: label || null,
        expires_at: expiresAt.toISOString(),
        created_by: auth.adminId,
      })
      .select('id, token, label, expires_at, created_at')
      .single();

    if (error) {
      logger.error('Failed to create investor token:', error, {
        component: 'api-route',
        action: 'api_request',
      });
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    logger.info('Investor token created', {
      component: 'api-route',
      action: 'token_created',
      tokenId: newToken.id,
      adminId: auth.adminId,
    });

    return NextResponse.json({ success: true, token: newToken });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/investor-tokens', method: 'POST' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/admin/investor-tokens POST error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/investor-tokens?id=<token_id>
 * Revoke a token (set is_revoked = true)
 */
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Admin auth
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Get token ID from query params
    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('id');

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
    }

    // Revoke token
    const { error } = await supabaseAdmin
      .from('investor_summary_tokens')
      .update({ is_revoked: true })
      .eq('id', tokenId);

    if (error) {
      logger.error('Failed to revoke investor token:', error, {
        component: 'api-route',
        action: 'api_request',
      });
      return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 });
    }

    logger.info('Investor token revoked', {
      component: 'api-route',
      action: 'token_revoked',
      tokenId,
      adminId: auth.adminId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/investor-tokens', method: 'DELETE' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/admin/investor-tokens DELETE error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
