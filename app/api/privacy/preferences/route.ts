// Privacy Preferences API Route
// Handles getting and updating user privacy preferences

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Validation schema for privacy preference updates
const PrivacyPreferenceUpdateSchema = z.object({
  activity_status_visible: z.boolean().optional(),
  share_anonymous_analytics: z.boolean().optional(),
  ccpa_do_not_sell: z.boolean().optional(),
  marketing_emails_enabled: z.boolean().optional(),
  marketing_sms_enabled: z.boolean().optional(),
  analytics_cookies_enabled: z.boolean().optional(),
  performance_cookies_enabled: z.boolean().optional(),
  advertising_cookies_enabled: z.boolean().optional(),
  share_data_with_partners: z.boolean().optional(),
  third_party_analytics_enabled: z.boolean().optional(),
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
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        const defaultPreferences = {
          user_id: userId,
          activity_status_visible: true,
          share_anonymous_analytics: false,
          ccpa_do_not_sell: true,
          marketing_emails_enabled: false,
          marketing_sms_enabled: false,
          analytics_cookies_enabled: false,
          performance_cookies_enabled: true,
          advertising_cookies_enabled: false,
          share_data_with_partners: false,
          third_party_analytics_enabled: false,
        };

        const { data: newData, error: insertError } = await supabase
          .from('user_privacy_preferences')
          .insert(defaultPreferences)
          .select()
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
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update privacy preferences
    const { data, error } = await supabase
      .from('user_privacy_preferences')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
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

    // Apply real privacy functionality
    await applyPrivacyChanges(userId, validatedData);

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
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!currentPrefs) return;

    // Log each changed preference
    const auditEntries = [];
    for (const [key, newValue] of Object.entries(changes)) {
      const oldValue = currentPrefs[key];
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

// Apply real privacy functionality based on changes
async function applyPrivacyChanges(userId: string, changes: Record<string, boolean>) {
  try {
    // Handle cookie preferences
    if (typeof changes.analytics_cookies_enabled !== 'undefined') {
      await updateExternalCookieConsent('analytics', changes.analytics_cookies_enabled);
    }
    if (typeof changes.advertising_cookies_enabled !== 'undefined') {
      await updateExternalCookieConsent('advertising', changes.advertising_cookies_enabled);
    }

    // Handle marketing preferences
    if (typeof changes.marketing_emails_enabled !== 'undefined') {
      await updateMarketingSubscription(userId, 'email', changes.marketing_emails_enabled);
    }
    if (typeof changes.marketing_sms_enabled !== 'undefined') {
      await updateMarketingSubscription(userId, 'sms', changes.marketing_sms_enabled);
    }

    // Handle CCPA Do Not Sell
    if (typeof changes.ccpa_do_not_sell !== 'undefined') {
      await updateDataSharingConsent(userId, !changes.ccpa_do_not_sell);
    }

    // Handle third-party analytics
    if (typeof changes.third_party_analytics_enabled !== 'undefined') {
      await updateThirdPartyAnalytics(userId, changes.third_party_analytics_enabled);
    }
  } catch (error) {
    logger.error('Error applying privacy changes:', error, { component: 'api-route', action: 'api_request' });
    // Log error but don't throw to avoid breaking preference updates
  }
}

// External service integrations
async function updateExternalCookieConsent(cookieType: string, enabled: boolean) {
  // This would integrate with your cookie management service
  // For now, we'll store the preference and handle it client-side
  logger.info(`Cookie consent updated: ${cookieType} = ${enabled}`, { component: 'api-route' });
}

async function updateMarketingSubscription(userId: string, type: 'email' | 'sms', enabled: boolean) {
  try {
    // Get user profile for email/phone
    // SECURITY: Use getUser() for server-side JWT verification — FIX-008
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const authHeaders: HeadersInit = {};
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, phone_number')
      .eq('id', userId)
      .single();

    if (!profile) return;

    if (type === 'email' && profile.email) {
      // Integrate with Resend or your email service
      await fetch(`${getAppUrl()}/api/marketing/email-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          email: profile.email,
          subscribed: enabled,
          userId,
        }),
      });
    }

    if (type === 'sms' && profile.phone_number) {
      // Integrate with Twilio or your SMS service
      await fetch(`${getAppUrl()}/api/marketing/sms-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          phone: profile.phone_number,
          subscribed: enabled,
          userId,
        }),
      });
    }
  } catch (error) {
    logger.error('Error updating ${type} subscription:', error, { component: 'api-route', action: 'api_request' });
  }
}

async function updateDataSharingConsent(userId: string, allowSharing: boolean) {
  try {
    // This would update your data sharing agreements with partners
    // For now, we'll log the change and implement partner integrations later
    logger.info(`Data sharing consent updated for user ${userId}: ${allowSharing}`, { component: 'api-route' });

    // You could integrate with partner APIs here to update their systems
    // Example: await updatePartnerConsentStatus(userId, allowSharing);
  } catch (error) {
    logger.error('Error updating data sharing consent:', error, { component: 'api-route', action: 'api_request' });
  }
}

async function updateThirdPartyAnalytics(userId: string, enabled: boolean) {
  try {
    // This would control third-party analytics services
    // For now, we'll log the change
    logger.info(`Third-party analytics updated for user ${userId}: ${enabled}`, { component: 'api-route' });

    // You could integrate with analytics services here
    // Example: await updateGoogleAnalyticsConsent(userId, enabled);
    // SECURITY: Use getUser() for server-side JWT verification — FIX-008
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const authHeaders: HeadersInit = {};
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
    }

    await fetch(`${getAppUrl()}/api/privacy/third-party-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ userId, enabled }),
    });
  } catch (error) {
    logger.error('Error updating third-party analytics:', error, { component: 'api-route', action: 'api_request' });
  }
}
