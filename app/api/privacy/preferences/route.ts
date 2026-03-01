// Privacy Preferences API Route
// Handles getting and updating user privacy preferences

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Columns that exist in the simplified user_privacy_preferences table
const PREFERENCE_COLUMNS = 'id, user_id, share_anonymous_analytics, ccpa_do_not_sell, marketing_emails_enabled, analytics_cookies_enabled, created_at, updated_at';

// Validation schema for privacy preference updates
// Only includes columns that exist after simplification migration
const PrivacyPreferenceUpdateSchema = z.object({
  share_anonymous_analytics: z.boolean().optional(),
  ccpa_do_not_sell: z.boolean().optional(),
  marketing_emails_enabled: z.boolean().optional(),
  analytics_cookies_enabled: z.boolean().optional(),
});

// GET - Fetch user's privacy preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Fetch privacy preferences
    const { data, error } = await supabase
      .from('user_privacy_preferences')
      .select(PREFERENCE_COLUMNS)
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        const defaultPreferences = {
          user_id: userId,
          share_anonymous_analytics: false,
          ccpa_do_not_sell: true,
          marketing_emails_enabled: false,
          analytics_cookies_enabled: false,
        };

        const { data: newData, error: insertError } = await supabase
          .from('user_privacy_preferences')
          .insert(defaultPreferences)
          .select(PREFERENCE_COLUMNS)
          .single();

        if (insertError) {
          logger.error('Error creating default privacy preferences:', insertError, { component: 'api-route', action: 'api_request' });
          return NextResponse.json(
            { success: false, error: 'Failed to create privacy preferences' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data: newData });
      }

      logger.error('Error fetching privacy preferences:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch privacy preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Privacy preferences GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update user's privacy preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = PrivacyPreferenceUpdateSchema.parse(body);

    // Get client IP and user agent for audit trail
    const clientIp = extractIP(request.headers);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update privacy preferences
    const { data, error } = await supabase
      .from('user_privacy_preferences')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select(PREFERENCE_COLUMNS)
      .single();

    if (error) {
      logger.error('Error updating privacy preferences:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to update privacy preferences' },
        { status: 500 }
      );
    }

    // Log preference changes for audit trail
    await logPreferenceChanges(supabase, userId, validatedData, clientIp, userAgent);

    return NextResponse.json({
      success: true,
      data,
      message: 'Privacy preferences updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Privacy preferences PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Log preference changes to audit trail
async function logPreferenceChanges(
  supabase: SupabaseServerClient,
  userId: string,
  changes: Record<string, boolean>,
  ipAddress: string,
  userAgent: string
) {
  try {
    // Get current preferences to compare
    const { data: currentPrefs } = await supabase
      .from('user_privacy_preferences')
      .select(PREFERENCE_COLUMNS)
      .eq('user_id', userId)
      .single();

    if (!currentPrefs) return;

    // Log each changed preference
    const auditEntries = [];
    for (const [key, newValue] of Object.entries(changes)) {
      const oldValue = (currentPrefs as Record<string, unknown>)[key];
      if (oldValue !== newValue) {
        auditEntries.push({
          user_id: userId,
          preference_key: key,
          old_value: oldValue,
          new_value: newValue,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      }
    }

    if (auditEntries.length > 0) {
      await supabase
        .from('privacy_preference_history')
        .insert(auditEntries);
    }
  } catch (error) {
    logger.error('Error logging preference changes:', error, { component: 'api-route', action: 'api_request' });
    // Don't throw error here to avoid breaking the main update
  }
}
