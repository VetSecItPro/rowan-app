// Calendar Capabilities API Route
// Reports which external-calendar providers this server can actually service,
// so the UI can hide/disable providers that aren't configured instead of
// letting the user click "Connect" and hit a 503. See
// docs/decisions/0022-external-calendar-integration-and-config-guards.md.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  googleCalendarService,
  outlookCalendarService,
} from '@/lib/services/calendar';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export interface CalendarCapabilities {
  google: boolean;
  outlook: boolean;
  apple: boolean;
  ics: boolean;
  cozi: boolean;
}

/** Returns which calendar providers are available on this deployment. */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Auth required - capability discovery is for signed-in users wiring up
    // their calendar settings, not anonymous probing.
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Google + Outlook are OAuth providers that need server-side credentials
    // (a Google Cloud OAuth client / an Azure AD app). Apple (CalDAV), ICS, and
    // Cozi (a branded ICS wrapper) authenticate with user-supplied credentials
    // at connect time, so they need no server config and are always available.
    const capabilities: CalendarCapabilities = {
      google: googleCalendarService.isConfigured(),
      outlook: outlookCalendarService.isConfigured(),
      apple: true,
      ics: true,
      cozi: true,
    };

    return NextResponse.json({ success: true, capabilities });
  } catch (error) {
    logger.error('Failed to resolve calendar capabilities:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Failed to resolve calendar capabilities' },
      { status: 500 }
    );
  }
}
