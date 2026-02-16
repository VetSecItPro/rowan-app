import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface SentryStatsResponse {
  configured: boolean;
  errorCounts?: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  timestamp: string;
}

/**
 * GET /api/admin/sentry-stats
 * Get error rate statistics from Sentry API
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
    const cookieStore = await safeCookiesAsync();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    try {
      const sessionData = await decryptSessionData(adminSession.value);

      // Validate session data and check expiration
      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }
    } catch (error) {
      logger.error('Admin session decryption failed:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Check if Sentry is configured
    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
    const sentryOrg = process.env.SENTRY_ORG;
    const sentryProject = process.env.SENTRY_PROJECT;

    if (!sentryAuthToken || !sentryOrg || !sentryProject) {
      const response: SentryStatsResponse = {
        configured: false,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    // Fetch error stats from Sentry API for different time ranges
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sentryBaseUrl = `https://sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/stats/`;

    // Fetch stats for all time ranges in parallel
    const [stats24h, stats7d, stats30d] = await Promise.allSettled([
      fetch(`${sentryBaseUrl}?stat=received&since=${Math.floor(oneDayAgo.getTime() / 1000)}&until=${Math.floor(now.getTime() / 1000)}&resolution=1h`, {
        headers: {
          Authorization: `Bearer ${sentryAuthToken}`,
        },
      }),
      fetch(`${sentryBaseUrl}?stat=received&since=${Math.floor(sevenDaysAgo.getTime() / 1000)}&until=${Math.floor(now.getTime() / 1000)}&resolution=1d`, {
        headers: {
          Authorization: `Bearer ${sentryAuthToken}`,
        },
      }),
      fetch(`${sentryBaseUrl}?stat=received&since=${Math.floor(thirtyDaysAgo.getTime() / 1000)}&until=${Math.floor(now.getTime() / 1000)}&resolution=1d`, {
        headers: {
          Authorization: `Bearer ${sentryAuthToken}`,
        },
      }),
    ]);

    // Process results
    let errorCount24h = 0;
    let errorCount7d = 0;
    let errorCount30d = 0;

    if (stats24h.status === 'fulfilled' && stats24h.value.ok) {
      const data = await stats24h.value.json();
      errorCount24h = data.reduce((sum: number, point: [number, number]) => sum + point[1], 0);
    }

    if (stats7d.status === 'fulfilled' && stats7d.value.ok) {
      const data = await stats7d.value.json();
      errorCount7d = data.reduce((sum: number, point: [number, number]) => sum + point[1], 0);
    }

    if (stats30d.status === 'fulfilled' && stats30d.value.ok) {
      const data = await stats30d.value.json();
      errorCount30d = data.reduce((sum: number, point: [number, number]) => sum + point[1], 0);
    }

    const response: SentryStatsResponse = {
      configured: true,
      errorCounts: {
        last24h: errorCount24h,
        last7d: errorCount7d,
        last30d: errorCount30d,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/sentry-stats',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/sentry-stats GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch Sentry stats' },
      { status: 500 }
    );
  }
}
