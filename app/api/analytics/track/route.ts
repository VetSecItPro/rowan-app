/**
 * Feature Usage Tracking API
 *
 * Records user interactions with app features for analytics.
 * Events are stored in feature_events table with 30-day retention.
 *
 * POST /api/analytics/track
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

// Valid features in the app
const VALID_FEATURES = [
  'dashboard',
  'tasks',
  'calendar',
  'reminders',
  'shopping',
  'meals',
  'recipes',
  'messages',
  'goals',
  'household',
  'projects',
  'expenses',
  'rewards',
  'checkin',
  'settings',
] as const;

// Valid action types
const VALID_ACTIONS = [
  'page_view',
  'create',
  'update',
  'delete',
  'complete',
  'share',
  'export',
  'import',
  'search',
  'filter',
] as const;

// Request validation schema
const TrackEventSchema = z.object({
  feature: z.enum(VALID_FEATURES),
  action: z.enum(VALID_ACTIONS),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  sessionId: z.string().max(100).optional(),
});

// Batch tracking schema (for multiple events)
const BatchTrackSchema = z.object({
  events: z.array(TrackEventSchema).min(1).max(50),
});

/**
 * Parse user agent to extract device info
 */
function parseUserAgent(userAgent: string | null): {
  deviceType: string;
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  // Device type detection
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    if (/iPad|Tablet/i.test(userAgent)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  }

  // Browser detection
  let browser = 'unknown';
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) {
    browser = 'chrome';
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browser = 'safari';
  } else if (/Firefox/i.test(userAgent)) {
    browser = 'firefox';
  } else if (/Edg/i.test(userAgent)) {
    browser = 'edge';
  } else if (/Opera|OPR/i.test(userAgent)) {
    browser = 'opera';
  }

  // OS detection
  let os = 'unknown';
  if (/Windows/i.test(userAgent)) {
    os = 'windows';
  } else if (/Mac OS|Macintosh/i.test(userAgent)) {
    os = 'macos';
  } else if (/Linux/i.test(userAgent) && !/Android/i.test(userAgent)) {
    os = 'linux';
  } else if (/Android/i.test(userAgent)) {
    os = 'android';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    os = 'ios';
  }

  return { deviceType, browser, os };
}

/** Records feature usage analytics events */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - slightly higher limit for analytics
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user (optional - allow anonymous tracking)
    const { data: { user } } = await supabase.auth.getUser();

    // Parse request body
    const body = await request.json();

    // Check if batch or single event
    const isBatch = 'events' in body;

    let events: z.infer<typeof TrackEventSchema>[];

    if (isBatch) {
      const validated = BatchTrackSchema.safeParse(body);
      if (!validated.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request', details: validated.error.issues },
          { status: 400 }
        );
      }
      events = validated.data.events;
    } else {
      const validated = TrackEventSchema.safeParse(body);
      if (!validated.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request', details: validated.error.issues },
          { status: 400 }
        );
      }
      events = [validated.data];
    }

    // Parse user agent for device info
    const userAgent = request.headers.get('user-agent');
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Get user's current space if authenticated
    let spaceId: string | null = null;
    if (user) {
      const { data: spaceMember } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      spaceId = spaceMember?.space_id || null;
    }

    // Insert events
    const insertPromises = events.map(async (event) => {
      const { data, error } = await supabase.rpc('record_feature_event', {
        p_user_id: user?.id || null,
        p_space_id: spaceId,
        p_feature: event.feature,
        p_action: event.action,
        p_metadata: event.metadata || {},
        p_device_type: deviceType,
        p_browser: browser,
        p_os: os,
        p_session_id: event.sessionId || null,
      });

      if (error) {
        logger.error('Error recording feature event:', error, { component: 'api-route', action: 'api_request' });
        return { success: false, error: 'Failed to record event' };
      }

      return { success: true, id: data };
    });

    const results = await Promise.all(insertPromises);

    // Check if any failed
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some events failed to record',
          recorded: results.filter((r) => r.success).length,
          failed: failures.length,
        },
        { status: 207 } // Multi-Status
      );
    }

    return NextResponse.json({
      success: true,
      recorded: results.length,
    });
  } catch (error) {
    logger.error('Error in analytics track API:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
