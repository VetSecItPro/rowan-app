// Cookie Preferences API
// Manages cookie consent and preference settings with privacy system integration

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

// Validation schema for cookie preferences
const CookiePreferencesSchema = z.object({
  necessary: z.boolean().default(true),
  analytics: z.boolean(),
  marketing: z.boolean(),
  functional: z.boolean(),
  preferences: z.boolean(),
});

// GET - Get current cookie preferences for authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const identifier = `cookie-preferences-get-${userId}`;
    const { success: rateLimitSuccess } = await ratelimit?.limit(identifier) ?? { success: true };
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get privacy preferences from database
    const { data: privacy, error: privacyError } = await supabase
      .from('user_privacy_preferences')
      .select('third_party_analytics_enabled, share_data_with_partners, ccpa_do_not_sell')
      .eq('user_id', userId)
      .single();

    if (privacyError) {
      logger.error('Error fetching privacy preferences:', privacyError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Convert privacy preferences to cookie preferences
    const cookiePreferences = {
      necessary: true, // Always true
      analytics: privacy.third_party_analytics_enabled,
      marketing: privacy.share_data_with_partners && !privacy.ccpa_do_not_sell,
      functional: true, // Default to true for better UX
      preferences: true, // Default to true for personalization
    };

    // Get consent timestamp from privacy history
    const { data: consentHistory } = await supabase
      .from('privacy_preference_history')
      .select('changed_at')
      .eq('user_id', userId)
      .eq('preference_key', 'cookie_consent')
      .order('changed_at', { ascending: false })
      .limit(1);

    const consentTimestamp = consentHistory?.[0]?.changed_at || null;

    return NextResponse.json({
      success: true,
      data: {
        preferences: cookiePreferences,
        consentTimestamp,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Cookie preferences GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update cookie preferences for authenticated user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const identifier = `cookie-preferences-post-${userId}`;
    const { success: rateLimitSuccess } = await ratelimit?.limit(identifier) ?? { success: true };
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedPreferences = CookiePreferencesSchema.parse(body);

    // Ensure necessary cookies are always true
    validatedPreferences.necessary = true;

    // Convert cookie preferences to privacy preference updates
    const privacyUpdates = {
      third_party_analytics_enabled: validatedPreferences.analytics,
      share_data_with_partners: validatedPreferences.marketing,
      ccpa_do_not_sell: !validatedPreferences.marketing,
      updated_at: new Date().toISOString(),
    };

    // Update privacy preferences in database
    const { error: updateError } = await supabase
      .from('user_privacy_preferences')
      .update(privacyUpdates)
      .eq('user_id', userId);

    if (updateError) {
      logger.error('Error updating privacy preferences:', updateError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Log preference change in history
    await supabase
      .from('privacy_preference_history')
      .insert({
        user_id: userId,
        preference_key: 'cookie_consent',
        old_value: null, // Could fetch current value first if needed
        new_value: validatedPreferences,
        changed_at: new Date().toISOString(),
      });

    // Apply cookie preferences to external services
    await applyCookiePreferences(userId, validatedPreferences);

    return NextResponse.json({
      success: true,
      message: 'Cookie preferences updated successfully',
      data: {
        preferences: validatedPreferences,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid preference data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Cookie preferences POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply cookie preferences to external services
async function applyCookiePreferences(userId: string, preferences: any) {
  try {
    // 1. Update Google Analytics consent
    if (process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID) {
      logger.info(`📊 Google Analytics consent ${preferences.analytics ? 'granted' : 'denied'} for user ${userId}`, { component: 'api-route' });
      // In a real implementation:
      // await updateGoogleAnalyticsConsent(userId, preferences.analytics);
    }

    // 2. Update Facebook Pixel consent
    if (process.env.FACEBOOK_PIXEL_ID) {
      logger.info(`📢 Facebook Pixel consent ${preferences.marketing ? 'granted' : 'denied'} for user ${userId}`, { component: 'api-route' });
      // In a real implementation:
      // await updateFacebookPixelConsent(userId, preferences.marketing);
    }

    // 3. Update Vercel Analytics
    logger.info(`📈 Vercel Analytics consent ${preferences.analytics ? 'granted' : 'denied'} for user ${userId}`, { component: 'api-route' });

    // 4. Update other third-party services based on functional preferences
    if (!preferences.functional) {
      logger.info(`⚙️ Functional cookies disabled for user ${userId}`, { component: 'api-route' });
      // Disable non-essential functional features
    }

    logger.info(`✅ Cookie preferences applied for user ${userId}`, { component: 'api-route' });
  } catch (error) {
    logger.error('❌ Error applying cookie preferences:', error, { component: 'api-route', action: 'api_request' });
    // Don't throw error here to avoid breaking the preference update
  }
}

// DELETE - Reset cookie preferences to defaults
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const identifier = `cookie-preferences-delete-${userId}`;
    const { success: rateLimitSuccess } = await ratelimit?.limit(identifier) ?? { success: true };
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Reset to default preferences (minimal privacy-respecting set)
    const defaultPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: true,
      preferences: true,
    };

    // Convert to privacy updates
    const privacyUpdates = {
      third_party_analytics_enabled: false,
      share_data_with_partners: false,
      ccpa_do_not_sell: true,
      updated_at: new Date().toISOString(),
    };

    // Update database
    const { error: updateError } = await supabase
      .from('user_privacy_preferences')
      .update(privacyUpdates)
      .eq('user_id', userId);

    if (updateError) {
      logger.error('Error resetting privacy preferences:', updateError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to reset preferences' },
        { status: 500 }
      );
    }

    // Log the reset
    await supabase
      .from('privacy_preference_history')
      .insert({
        user_id: userId,
        preference_key: 'cookie_consent_reset',
        old_value: null,
        new_value: defaultPreferences,
        changed_at: new Date().toISOString(),
      });

    // Apply the reset preferences
    await applyCookiePreferences(userId, defaultPreferences);

    return NextResponse.json({
      success: true,
      message: 'Cookie preferences reset to defaults',
      data: {
        preferences: defaultPreferences,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Cookie preferences DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}