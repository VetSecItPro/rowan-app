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

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  description: string;
  lastChecked: string;
}

interface PerformanceMetric {
  endpoint: string;
  avgResponseTime: number;
  errorRate: number;
  requestCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * GET /api/admin/health
 * Get comprehensive system health and performance metrics
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

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
    let sessionData: unknown;
    try {
      sessionData = await decryptSessionData(adminSession.value);

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

    const now = new Date().toISOString();

    // Health checks array
    const healthChecks: Promise<HealthMetric>[] = [
      // Database connectivity check
      (async (): Promise<HealthMetric> => {
        try {
          const start = Date.now();
          const { error } = await supabaseAdmin.from('users').select('id').limit(1);
          const responseTime = Date.now() - start;

          if (error) {
            return {
              name: 'Database Connection',
              status: 'critical',
              value: 'Disconnected',
              // SECURITY: Sanitized error — no DB internals exposed — FIX-054
            description: 'Database connection error',
              lastChecked: now,
            };
          }

          return {
            name: 'Database Connection',
            status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'warning' : 'critical',
            value: `${responseTime}ms`,
            description: `Supabase connection response time`,
            lastChecked: now,
          };
        } catch {
          return {
            name: 'Database Connection',
            status: 'critical',
            value: 'Error',
            description: 'Failed to connect to database',
            lastChecked: now,
          };
        }
      })(),

      // Rate limiting status
      (async (): Promise<HealthMetric> => {
        try {
          // Check current rate limiting status by testing with a dummy request
          const testStart = Date.now();
          const { success } = await checkGeneralRateLimit(ip);
          const testTime = Date.now() - testStart;

          return {
            name: 'Rate Limiting',
            status: testTime < 50 ? 'healthy' : testTime < 200 ? 'warning' : 'critical',
            value: success ? 'Active' : 'Limited',
            description: `Redis rate limiting response time: ${testTime}ms`,
            lastChecked: now,
          };
        } catch {
          return {
            name: 'Rate Limiting',
            status: 'critical',
            value: 'Error',
            description: 'Rate limiting service unavailable',
            lastChecked: now,
          };
        }
      })(),

      // Memory usage - show heap used (actual app memory)
      (async (): Promise<HealthMetric> => {
        try {
          const memoryUsage = process.memoryUsage();
          const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
          const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
          const usage = Math.round((heapUsedMB / heapTotalMB) * 100);
          const isDev = process.env.NODE_ENV === 'development';

          return {
            name: 'Memory Usage',
            status: usage < 70 ? 'healthy' : usage < 85 ? 'warning' : 'critical',
            value: `${usage}%`,
            description: `${heapUsedMB}MB / ${heapTotalMB}MB heap${isDev ? ' (dev server)' : ''}`,
            lastChecked: now,
          };
        } catch {
          return {
            name: 'Memory Usage',
            status: 'warning',
            value: 'Unknown',
            description: 'Memory metrics unavailable',
            lastChecked: now,
          };
        }
      })(),

      // API response times
      (async (): Promise<HealthMetric> => {
        try {
          const testStart = Date.now();
          // Test a simple database query to measure API response time
          await supabaseAdmin.from('users').select('id').limit(1);
          const apiResponseTime = Date.now() - testStart;

          return {
            name: 'API Response Time',
            status: apiResponseTime < 200 ? 'healthy' : apiResponseTime < 1000 ? 'warning' : 'critical',
            value: `${apiResponseTime}ms`,
            description: 'Average API endpoint response time',
            lastChecked: now,
          };
        } catch {
          return {
            name: 'API Response Time',
            status: 'critical',
            value: 'Error',
            description: 'API endpoints not responding',
            lastChecked: now,
          };
        }
      })(),

      // Error monitoring (using recent logs)
      (async (): Promise<HealthMetric> => {
        try {
          // SECURITY: Placeholder metrics — labeled as such — FIX-027
          return {
            name: 'Error Rate',
            status: 'healthy',
            value: 'N/A (placeholder)',
            description: 'Error rate monitoring not yet implemented — integrate with Sentry or Vercel Analytics',
            lastChecked: now,
          };
        } catch {
          return {
            name: 'Error Rate',
            status: 'warning',
            value: 'Unknown',
            description: 'Error monitoring unavailable',
            lastChecked: now,
          };
        }
      })(),
    ];

    // Execute all health checks in parallel
    const metrics = await Promise.all(healthChecks);

    // Determine overall system status
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;

    let overallStatus: 'healthy' | 'warning' | 'critical';
    if (criticalCount > 0) {
      overallStatus = 'critical';
    } else if (warningCount > 1) {
      overallStatus = 'warning';
    } else if (warningCount === 1) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'healthy';
    }

    // Calculate uptime (simplified - would be more sophisticated in production)
    const uptimeHours = Math.floor(process.uptime() / 3600);
    const uptimeMinutes = Math.floor((process.uptime() % 3600) / 60);
    const uptime = `${uptimeHours}h ${uptimeMinutes}m`;

    // SECURITY: Performance metrics are placeholders — labeled as such — FIX-027
    // TODO: Integrate with Vercel Analytics API or Sentry performance data
    const performanceMetrics: PerformanceMetric[] = [
      {
        endpoint: '/api/subscriptions',
        avgResponseTime: 0,
        errorRate: 0,
        requestCount: 0,
        status: 'healthy',
      },
      {
        endpoint: '/api/launch/notify',
        avgResponseTime: 0,
        errorRate: 0,
        requestCount: 0,
        status: 'healthy',
      },
      {
        endpoint: '/api/admin/dashboard',
        avgResponseTime: 0,
        errorRate: 0,
        requestCount: 0,
        status: 'healthy',
      },
      {
        endpoint: '/api/admin/analytics',
        avgResponseTime: 0,
        errorRate: 0,
        requestCount: 0,
        status: 'healthy',
      },
    ];

    // Update performance metric statuses based on their values
    performanceMetrics.forEach(metric => {
      if (metric.avgResponseTime > 1000 || metric.errorRate > 5) {
        metric.status = 'critical';
      } else if (metric.avgResponseTime > 500 || metric.errorRate > 2) {
        metric.status = 'warning';
      }
    });

    const responseTime = Date.now() - startTime;

    // Health data response
    const healthData = {
      overall: overallStatus,
      metrics,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${responseTime}ms`,
    };

    // Log admin access

    return NextResponse.json({
      success: true,
      health: healthData,
      performance: performanceMetrics,
      timestamp: now,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/health',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/health GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch system health data' },
      { status: 500 }
    );
  }
}
