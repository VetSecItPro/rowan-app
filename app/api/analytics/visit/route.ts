/**
 * Visitor Analytics Beacon API
 *
 * PUBLIC endpoint (no auth required) that receives page view beacons
 * from the client-side VisitorTracker component. Records anonymous
 * visit data with daily-unique visitor hashing for analytics.
 *
 * POST /api/analytics/visit
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { extractIP, fallbackRateLimit } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Zod schema for visit beacon payload */
const VisitBeaconSchema = z.object({
  path: z.string().min(1).max(2048).trim(),
  referrer: z.string().max(2048).trim().optional(),
  utm_source: z.string().max(255).trim().optional(),
  utm_medium: z.string().max(255).trim().optional(),
  utm_campaign: z.string().max(255).trim().optional(),
}).strict();

/**
 * Compute a daily-unique visitor hash from IP + User-Agent + date.
 * SHA-256 ensures the original IP is not recoverable.
 */
function computeVisitorHash(ip: string, userAgent: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return createHash('sha256')
    .update(`${ip}${userAgent}${today}`)
    .digest('hex');
}

/**
 * Detect device type from User-Agent string.
 */
function detectDeviceType(ua: string): string {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod|Opera Mini|IEMobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Detect browser name from User-Agent string.
 */
function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  return 'Other';
}

/** Records a page visit beacon */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 100 requests per minute per IP
    const ip = extractIP(request.headers);
    const allowed = fallbackRateLimit(ip, 100, 60 * 1000);

    if (!allowed) {
      return new Response(null, { status: 429 });
    }

    // Parse and validate the beacon payload
    const body = await request.json();
    const parseResult = VisitBeaconSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(null, { status: 400 });
    }

    const { path, referrer, utm_source, utm_medium, utm_campaign } = parseResult.data;

    // Extract contextual information from headers
    const userAgent = request.headers.get('user-agent') || '';
    const country = request.headers.get('x-vercel-ip-country') || null;

    // Compute daily-unique visitor hash (privacy-preserving)
    const visitorHash = computeVisitorHash(ip, userAgent);

    // Detect device and browser from User-Agent
    const deviceType = detectDeviceType(userAgent);
    const browser = detectBrowser(userAgent);

    // Insert visit record via admin client (no auth/RLS needed for public analytics)
    const { error } = await supabaseAdmin
      .from('site_visits')
      .insert({
        visitor_hash: visitorHash,
        path,
        referrer: referrer || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        device_type: deviceType,
        browser,
        country,
      });

    if (error) {
      logger.error('Failed to record site visit', error, {
        component: 'analytics-visit',
        action: 'insert_visit',
      });
      return new Response(null, { status: 500 });
    }

    // 204 No Content — beacon acknowledged, no response body needed
    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error('Unexpected error in visit beacon API', error, {
      component: 'analytics-visit',
      action: 'api_request',
    });
    return new Response(null, { status: 500 });
  }
}
