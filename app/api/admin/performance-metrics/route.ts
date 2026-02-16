import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface PerformanceMetricsResponse {
  configured: boolean;
  source?: 'vercel' | 'health' | 'placeholder';
  metrics?: {
    p50: number;
    p95: number;
    p99: number;
  };
  timestamp: string;
}

/**
 * GET /api/admin/performance-metrics
 * Get API performance metrics (p50, p95, p99 response times)
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

    // Check if Vercel Analytics API is configured
    const vercelApiToken = process.env.VERCEL_API_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    // Try Vercel Analytics API first
    if (vercelApiToken && vercelTeamId && vercelProjectId) {
      try {
        // Fetch performance metrics from Vercel Analytics API
        // Note: This is a placeholder - actual Vercel Analytics API endpoint may differ
        const vercelUrl = `https://api.vercel.com/v1/projects/${vercelProjectId}/analytics?teamId=${vercelTeamId}`;
        const vercelResponse = await fetch(vercelUrl, {
          headers: {
            Authorization: `Bearer ${vercelApiToken}`,
          },
        });

        if (vercelResponse.ok) {
          const data = await vercelResponse.json();
          // Extract performance metrics if available
          // This is a placeholder structure - adjust based on actual Vercel API response
          const metrics = {
            p50: data.p50 || 0,
            p95: data.p95 || 0,
            p99: data.p99 || 0,
          };

          const response: PerformanceMetricsResponse = {
            configured: true,
            source: 'vercel',
            metrics,
            timestamp: new Date().toISOString(),
          };
          return NextResponse.json(response);
        }
      } catch (vercelError) {
        logger.error('Vercel Analytics API error:', vercelError, { component: 'api-route', action: 'api_request' });
        // Continue to fallback methods
      }
    }

    // Fallback: Calculate from health endpoint data
    try {
      // Run multiple test queries to sample response times
      const samples: number[] = [];
      const sampleCount = 10;

      for (let i = 0; i < sampleCount; i++) {
        const start = Date.now();
        await supabaseAdmin.from('users').select('id').limit(1);
        const responseTime = Date.now() - start;
        samples.push(responseTime);
      }

      // Sort samples for percentile calculation
      samples.sort((a, b) => a - b);

      // Calculate percentiles
      const p50Index = Math.floor(samples.length * 0.5);
      const p95Index = Math.floor(samples.length * 0.95);
      const p99Index = Math.floor(samples.length * 0.99);

      const metrics = {
        p50: samples[p50Index] || 0,
        p95: samples[p95Index] || samples[samples.length - 1] || 0,
        p99: samples[p99Index] || samples[samples.length - 1] || 0,
      };

      const response: PerformanceMetricsResponse = {
        configured: true,
        source: 'health',
        metrics,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response);

    } catch (healthError) {
      logger.error('Health endpoint sampling error:', healthError, { component: 'api-route', action: 'api_request' });
    }

    // Final fallback: Return placeholder
    const response: PerformanceMetricsResponse = {
      configured: false,
      source: 'placeholder',
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(response);

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/performance-metrics',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/performance-metrics GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}
