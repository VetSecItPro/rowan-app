/**
 * Subscription Analytics API Route
 * GET /api/admin/subscription-analytics - Get subscription metrics and revenue data
 *
 * Provides:
 * - Revenue metrics (MRR, ARR, ARPU)
 * - Subscription distribution by tier and period
 * - Churn and conversion rates
 * - Event history with pagination
 * - Daily revenue data for charts
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import {
  getSubscriptionMetrics,
  getSubscriptionEvents,
  getDailyRevenueData,
} from '@/lib/services/subscription-analytics-service';
import { z } from 'zod';

// Query parameter validation schema
const QueryParamsSchema = z.object({
  view: z.enum(['metrics', 'events', 'revenue', 'all']).default('all'),
  eventType: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  days: z.coerce.number().int().min(1).max(365).default(30),
  refresh: z.enum(['true', 'false']).optional(),
});

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/subscription-analytics
 * Get comprehensive subscription analytics data
 *
 * Query params:
 * - view: 'metrics' | 'events' | 'revenue' | 'all' (default: 'all')
 * - eventType: Filter events by type (optional)
 * - limit: Number of events to return (default: 50)
 * - offset: Pagination offset for events (default: 0)
 * - days: Number of days for revenue chart (default: 30)
 * - refresh: 'true' to bypass cache
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check admin authentication
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    let sessionData;
    try {
      sessionData = await decryptSessionData(adminSession.value);

      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('Admin session decryption failed:', error);
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = QueryParamsSchema.parse({
      view: searchParams.get('view') || 'all',
      eventType: searchParams.get('eventType') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
      days: searchParams.get('days') || '30',
      refresh: searchParams.get('refresh') || undefined,
    });
    const { view, eventType, limit, offset, days } = validatedParams;
    const forceRefresh = validatedParams.refresh === 'true';

    // Build response based on view parameter
    const response: Record<string, unknown> = {};

    // Fetch data based on view
    if (view === 'all' || view === 'metrics') {
      response.metrics = await withCache(
        ADMIN_CACHE_KEYS.subscriptionMetrics,
        () => getSubscriptionMetrics(),
        { ttl: ADMIN_CACHE_TTL.subscriptionAnalytics, skipCache: forceRefresh }
      );
    }

    if (view === 'all' || view === 'events') {
      response.events = await withCache(
        ADMIN_CACHE_KEYS.subscriptionEvents(eventType || null, limit, offset),
        () => getSubscriptionEvents({ limit, offset, eventType }),
        { ttl: ADMIN_CACHE_TTL.subscriptionAnalytics, skipCache: forceRefresh }
      );
    }

    if (view === 'all' || view === 'revenue') {
      response.dailyRevenue = await withCache(
        ADMIN_CACHE_KEYS.dailyRevenue(days),
        () => getDailyRevenueData(days),
        { ttl: ADMIN_CACHE_TTL.subscriptionAnalytics, skipCache: forceRefresh }
      );
    }

    // Add metadata
    response.lastUpdated = new Date().toISOString();
    response.view = view;

    return NextResponse.json({
      success: true,
      ...response,
    });

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/subscription-analytics',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    return NextResponse.json(
      { error: 'Failed to fetch subscription analytics' },
      { status: 500 }
    );
  }
}
