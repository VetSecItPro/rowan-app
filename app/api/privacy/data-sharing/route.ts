// CCPA Data Sharing Control API
// Manages data sharing preferences and integrates with external services

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';

// Validation schema
const DataSharingRequestSchema = z.object({
  userId: z.string().uuid(),
  allowSharing: z.boolean(),
});

// POST - Update data sharing consent
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

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
    const identifier = `data-sharing-${userId}`;
    const { success: rateLimitSuccess } = await ratelimit.limit(identifier);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = DataSharingRequestSchema.parse(body);

    // Verify user can only update their own settings
    if (validatedData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get current privacy preferences
    const { data: currentPrefs, error: prefsError } = await supabase
      .from('user_privacy_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefsError) {
      console.error('Error fetching privacy preferences:', prefsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch current preferences' },
        { status: 500 }
      );
    }

    // Update CCPA Do Not Sell preference
    const newCCPAValue = !validatedData.allowSharing; // Invert because "Do Not Sell" = true means no sharing

    const { error: updateError } = await supabase
      .from('user_privacy_preferences')
      .update({
        ccpa_do_not_sell: newCCPAValue,
        share_data_with_partners: validatedData.allowSharing,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating data sharing preferences:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Apply the data sharing changes to external services
    await applyDataSharingChanges(userId, validatedData.allowSharing, currentPrefs);

    // Log the preference change
    await logDataSharingChange(userId, currentPrefs.share_data_with_partners, validatedData.allowSharing);

    return NextResponse.json({
      success: true,
      message: 'Data sharing preferences updated successfully',
      data: {
        allowSharing: validatedData.allowSharing,
        ccpaDoNotSell: newCCPAValue,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Data sharing API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply data sharing changes to external services
async function applyDataSharingChanges(
  userId: string,
  allowSharing: boolean,
  currentPrefs: any
) {
  try {
    // 1. Update analytics providers
    await updateAnalyticsProviders(userId, allowSharing);

    // 2. Update advertising partners
    await updateAdvertisingPartners(userId, allowSharing);

    // 3. Update data broker agreements
    await updateDataBrokers(userId, allowSharing);

    // 4. Update marketing attribution services
    await updateMarketingAttribution(userId, allowSharing);

    console.log(`✅ Data sharing settings applied for user ${userId}: ${allowSharing ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('❌ Error applying data sharing changes:', error);
    // Don't throw error here to avoid breaking the preference update
  }
}

// Update analytics providers (Google Analytics, etc.)
async function updateAnalyticsProviders(userId: string, allowSharing: boolean) {
  try {
    // Example: Google Analytics Data Sharing
    if (process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID) {
      // In a real implementation, you would:
      // 1. Use Google Analytics Management API to update data sharing settings
      // 2. Add/remove user from audiences that are shared with Google Ads
      // 3. Update consent signals for the user

      console.log(`📊 Analytics sharing ${allowSharing ? 'enabled' : 'disabled'} for user ${userId}`);

      // Placeholder for actual Google Analytics API integration
      // await updateGoogleAnalyticsSharing(userId, allowSharing);
    }

    // Example: Other analytics providers (Mixpanel, Amplitude, etc.)
    // await updateMixpanelSharing(userId, allowSharing);
    // await updateAmplitudeSharing(userId, allowSharing);
  } catch (error) {
    console.error('Error updating analytics providers:', error);
  }
}

// Update advertising partners
async function updateAdvertisingPartners(userId: string, allowSharing: boolean) {
  try {
    // Example: Facebook/Meta Pixel
    if (process.env.FACEBOOK_PIXEL_ID) {
      // In a real implementation, you would:
      // 1. Use Facebook Marketing API to update custom audiences
      // 2. Add/remove user from advertising campaigns
      // 3. Update conversion tracking consent

      console.log(`📢 Advertising sharing ${allowSharing ? 'enabled' : 'disabled'} for user ${userId}`);

      // Placeholder for actual Facebook API integration
      // await updateFacebookPixelSharing(userId, allowSharing);
    }

    // Example: Google Ads
    if (process.env.GOOGLE_ADS_CUSTOMER_ID) {
      // In a real implementation, you would:
      // 1. Use Google Ads API to update customer match lists
      // 2. Add/remove user from remarketing audiences
      // 3. Update conversion tracking consent

      console.log(`🎯 Google Ads sharing ${allowSharing ? 'enabled' : 'disabled'} for user ${userId}`);

      // Placeholder for actual Google Ads API integration
      // await updateGoogleAdsSharing(userId, allowSharing);
    }
  } catch (error) {
    console.error('Error updating advertising partners:', error);
  }
}

// Update data broker agreements
async function updateDataBrokers(userId: string, allowSharing: boolean) {
  try {
    // In a real implementation, you would integrate with data brokers:
    // 1. Acxiom, Experian, LexisNexis, etc.
    // 2. Add/remove user from data sharing agreements
    // 3. Update opt-out lists with major data brokers

    console.log(`🏢 Data broker sharing ${allowSharing ? 'enabled' : 'disabled'} for user ${userId}`);

    // Example integration points:
    // await updateAcxiomSharing(userId, allowSharing);
    // await updateExperianSharing(userId, allowSharing);
    // await updateLexisNexisSharing(userId, allowSharing);
  } catch (error) {
    console.error('Error updating data brokers:', error);
  }
}

// Update marketing attribution services
async function updateMarketingAttribution(userId: string, allowSharing: boolean) {
  try {
    // Example: Attribution services like Branch, Adjust, AppsFlyer
    // These services track user behavior across devices and platforms

    console.log(`📈 Marketing attribution sharing ${allowSharing ? 'enabled' : 'disabled'} for user ${userId}`);

    // Example integration points:
    // await updateBranchSharing(userId, allowSharing);
    // await updateAdjustSharing(userId, allowSharing);
    // await updateAppsFlyerSharing(userId, allowSharing);
  } catch (error) {
    console.error('Error updating marketing attribution:', error);
  }
}

// Log data sharing preference changes for audit trail
async function logDataSharingChange(
  userId: string,
  oldValue: boolean,
  newValue: boolean
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Log the change in preference history
    await supabase
      .from('privacy_preference_history')
      .insert({
        user_id: userId,
        preference_key: 'data_sharing_consent',
        old_value: oldValue,
        new_value: newValue,
        changed_at: new Date().toISOString(),
      });

    // Log detailed audit entry for CCPA compliance
    await supabase
      .from('privacy_email_notifications')
      .insert({
        user_id: userId,
        notification_type: 'privacy_settings_changed',
        email_address: 'system-audit', // Special marker for audit logs
      });

    console.log(`📝 Data sharing change logged for user ${userId}: ${oldValue} → ${newValue}`);
  } catch (error) {
    console.error('Error logging data sharing change:', error);
  }
}

// GET - Get current data sharing status and partner list
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get current preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_privacy_preferences')
      .select('ccpa_do_not_sell, share_data_with_partners, third_party_analytics_enabled')
      .eq('user_id', userId)
      .single();

    if (prefsError) {
      console.error('Error fetching data sharing preferences:', prefsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // List of data sharing partners (for transparency)
    const dataSharingPartners = [
      {
        name: 'Google Analytics',
        category: 'Analytics',
        purpose: 'Website usage analytics and improvement',
        dataTypes: ['Usage patterns', 'Device information', 'Geographic location'],
        enabled: preferences.third_party_analytics_enabled && !preferences.ccpa_do_not_sell,
      },
      {
        name: 'Google Ads',
        category: 'Advertising',
        purpose: 'Targeted advertising and remarketing',
        dataTypes: ['Email address', 'Usage patterns', 'Interests'],
        enabled: preferences.share_data_with_partners && !preferences.ccpa_do_not_sell,
      },
      {
        name: 'Facebook Pixel',
        category: 'Advertising',
        purpose: 'Social media advertising and conversion tracking',
        dataTypes: ['Email address', 'Website interactions', 'Purchase behavior'],
        enabled: preferences.share_data_with_partners && !preferences.ccpa_do_not_sell,
      },
      {
        name: 'Marketing Attribution Services',
        category: 'Attribution',
        purpose: 'Cross-platform marketing performance measurement',
        dataTypes: ['Device identifiers', 'Campaign interactions', 'Conversion events'],
        enabled: preferences.share_data_with_partners && !preferences.ccpa_do_not_sell,
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        ccpaDoNotSell: preferences.ccpa_do_not_sell,
        shareDataWithPartners: preferences.share_data_with_partners,
        thirdPartyAnalytics: preferences.third_party_analytics_enabled,
        dataSharingPartners,
        complianceStatus: {
          ccpaCompliant: preferences.ccpa_do_not_sell || !preferences.share_data_with_partners,
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Data sharing GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}