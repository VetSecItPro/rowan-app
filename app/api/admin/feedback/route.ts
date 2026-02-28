/**
 * Admin Feedback API Route
 * GET   /api/admin/feedback — List all feedback with filters + stats
 * PATCH /api/admin/feedback — Update feedback status/notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { getAllFeedback, updateFeedbackStatus, getFeedbackStats } from '@/lib/services/feedback-service';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['open', 'in_progress', 'done', 'deleted', 'all']).default('all'),
  category: z.enum(['bug_report', 'feature_request', 'general', 'all']).default('all'),
  search: z.string().max(200).optional(),
});

const UpdateSchema = z.object({
  feedbackId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'done', 'deleted']).optional(),
  admin_notes: z.string().max(2000).optional(),
});

/** Verify admin session from encrypted cookie. Returns null on success, or a NextResponse on failure. */
async function verifyAdmin(): Promise<NextResponse | null> {
  const cookieStore = await safeCookiesAsync();
  const adminSession = cookieStore.get('admin-session');

  if (!adminSession) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    const sessionData = await decryptSessionData(adminSession.value);
    if (!validateSessionData(sessionData)) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
    }
  } catch (error) {
    logger.error('Admin session decryption failed:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  return null; // success
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Admin auth
    const authError = await verifyAdmin();
    if (authError) return authError;

    // Parse query params
    const { searchParams } = new URL(req.url);
    const validated = ListQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      status: searchParams.get('status') || 'all',
      category: searchParams.get('category') || 'all',
      search: searchParams.get('search') || undefined,
    });

    // Fetch feedback + stats in parallel
    const [feedbackResult, statsResult] = await Promise.all([
      getAllFeedback(validated),
      getFeedbackStats(),
    ]);

    if (!feedbackResult.success) {
      return NextResponse.json({ error: feedbackResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      feedback: feedbackResult.data,
      stats: statsResult.success ? statsResult.data : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    Sentry.captureException(error, { tags: { endpoint: '/api/admin/feedback', method: 'GET' } });
    logger.error('[API] /api/admin/feedback GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Admin auth
    const authError = await verifyAdmin();
    if (authError) return authError;

    // Parse body
    const body = await req.json();
    const validated = UpdateSchema.parse(body);

    if (!validated.status && validated.admin_notes === undefined) {
      return NextResponse.json({ error: 'At least one field (status or admin_notes) is required' }, { status: 400 });
    }

    const result = await updateFeedbackStatus(validated.feedbackId, {
      status: validated.status,
      admin_notes: validated.admin_notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    Sentry.captureException(error, { tags: { endpoint: '/api/admin/feedback', method: 'PATCH' } });
    logger.error('[API] /api/admin/feedback PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}
