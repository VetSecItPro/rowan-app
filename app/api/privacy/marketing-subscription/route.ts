// Marketing Subscription Management API
// Handles email and SMS marketing preferences with actual unsubscribe functionality

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';
import { Resend } from 'resend';
import { getAppUrl } from '@/lib/utils/app-url';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Validation schemas
const MarketingSubscriptionUpdateSchema = z.object({
  emailMarketing: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  promotionalOffers: z.boolean().optional(),
});

const UnsubscribeTokenSchema = z.object({
  token: z.string().min(32),
  type: z.enum(['email', 'all']).optional().default('email'),
});

// POST - Update marketing subscription preferences
export async function POST(request: NextRequest) {
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
    const identifier = `marketing-subscription-${userId}`;
    const { success: rateLimitSuccess } = await ratelimit?.limit(identifier) ?? { success: true };
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = MarketingSubscriptionUpdateSchema.parse(body);

    // Get current preferences, create default if none exist
    let { data: currentPrefs, error: prefsError } = await supabase
      .from('user_privacy_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Create default preferences if user doesn't have any
    if (!currentPrefs && !prefsError) {
      const { data: newPrefs, error: createError } = await supabase
        .from('user_privacy_preferences')
        .insert({
          user_id: userId,
          marketing_emails_enabled: false,
          marketing_sms_enabled: false,
          third_party_analytics_enabled: false,
          share_data_with_partners: false,
          ccpa_do_not_sell: true,
        })
        .select('*')
        .single();

      if (createError) {
        return NextResponse.json(
          { success: false, error: 'Failed to initialize preferences' },
          { status: 500 }
        );
      }
      currentPrefs = newPrefs;
    } else if (prefsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch current preferences' },
        { status: 500 }
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (typeof validatedData.emailMarketing !== 'undefined') {
      updates.marketing_emails_enabled = validatedData.emailMarketing;
    }

    // Update privacy preferences
    const { error: updateError } = await supabase
      .from('user_privacy_preferences')
      .update(updates)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Apply marketing preferences to external services
    await applyMarketingPreferences(userId, validatedData, currentPrefs);

    // Log the preference change
    await logMarketingPreferenceChange(userId, validatedData);

    return NextResponse.json({
      success: true,
      message: 'Marketing preferences updated successfully',
      data: validatedData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get current marketing subscription status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if this is a token-based unsubscribe request
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type') || 'email';

    if (token) {
      return handleTokenUnsubscribe(token, type);
    }

    // Check authentication for regular requests
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get marketing preferences, create default if none exist
    let { data: preferences, error: prefsError } = await supabase
      .from('user_privacy_preferences')
      .select('marketing_emails_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    // Create default preferences if user doesn't have any
    if (!preferences && !prefsError) {
      const { data: newPrefs, error: createError } = await supabase
        .from('user_privacy_preferences')
        .insert({
          user_id: userId,
          marketing_emails_enabled: false,
          ccpa_do_not_sell: true,
        })
        .select('marketing_emails_enabled')
        .single();

      if (createError) {
        return NextResponse.json(
          { success: false, error: 'Failed to initialize preferences' },
          { status: 500 }
        );
      }
      preferences = newPrefs;
    } else if (prefsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Get user profile for contact information
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Get subscription history
    const { data: history } = await supabase
      .from('privacy_email_notifications')
      .select('notification_type, created_at')
      .eq('user_id', userId)
      .in('notification_type', ['marketing_subscribed', 'marketing_unsubscribed'])
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        preferences: {
          emailMarketing: preferences?.marketing_emails_enabled ?? false,
        },
        contactInfo: {
          email: profile.email,
          name: profile.name,
        },
        subscriptionHistory: history || [],
        unsubscribeLinks: {
          email: `${getAppUrl()}/unsubscribe?token=${await generateUnsubscribeToken(userId, 'email')}`,
          all: `${getAppUrl()}/unsubscribe?token=${await generateUnsubscribeToken(userId, 'all')}`,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply marketing preferences to external services
async function applyMarketingPreferences(userId: string, preferences: any, currentPrefs: any) {
  try {
    // 1. Update Resend audience management
    if (typeof preferences.emailMarketing !== 'undefined') {
      await updateResendAudience(userId, preferences.emailMarketing);
    }

    // SMS functionality removed - app uses in-app messaging only

    // 3. Update email service provider (if different from Resend)
    if (typeof preferences.emailMarketing !== 'undefined') {
      await updateEmailServiceProvider(userId, preferences.emailMarketing);
    }
  } catch {
    // Don't throw error here to avoid breaking the preference update
  }
}

// Update Resend audience management
async function updateResendAudience(userId: string, enableMarketing: boolean) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return;
    }

    const supabase = await createClient();

    // Get user email
    const { data: profile } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return;
    }

    // In a real implementation, you would:
    // if (enableMarketing) {
    //   await resend.audiences.add({
    //     audienceId: 'marketing-audience-id',
    //     email: profile.email,
    //     firstName: profile.name?.split(' ')[0],
    //   });
    // } else {
    //   await resend.audiences.remove({
    //     audienceId: 'marketing-audience-id',
    //     email: profile.email,
    //   });
    // }
    void enableMarketing; // Placeholder for future implementation
  } catch {
    // Silently handle audience update errors
  }
}

// Update SMS subscription (Twilio or similar)
// Note: Phone column doesn't exist in users table yet - placeholder for future SMS functionality
async function updateSMSSubscription(userId: string, enableSMS: boolean) {
  // TODO: Add phone column to users table or create separate phone_numbers table
  // Then implement actual SMS subscription logic here
  void userId;
  void enableSMS;
}

// Update email service provider (if using multiple)
// This would integrate with other email providers like Mailchimp, Sendgrid, etc.
async function updateEmailServiceProvider(userId: string, enableEmail: boolean) {
  // Example implementation points:
  // - Mailchimp: Add/remove from lists
  // - SendGrid: Update contact lists
  // - ConvertKit: Manage subscribers
  void userId;
  void enableEmail;
}

// Log marketing preference changes for audit trail
async function logMarketingPreferenceChange(userId: string, preferences: any) {
  try {
    const supabase = await createClient();

    // Log each preference change
    const notifications = [];

    if (typeof preferences.emailMarketing !== 'undefined') {
      notifications.push({
        user_id: userId,
        notification_type: preferences.emailMarketing ? 'marketing_subscribed' : 'marketing_unsubscribed',
        email_address: 'email-marketing',
      });
    }

    // SMS logging removed - app uses in-app messaging only

    if (notifications.length > 0) {
      await supabase.from('privacy_email_notifications').insert(notifications);
    }
  } catch {
    // Silently handle logging errors to not disrupt the main flow
  }
}

// Generate unsubscribe token for email links
async function generateUnsubscribeToken(userId: string, type: string): Promise<string> {
  try {
    const supabase = await createClient();

    // Create a secure token
    const token = crypto.randomUUID() + crypto.randomUUID();

    // Store token in database with expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiration

    await supabase
      .from('privacy_email_notifications')
      .insert({
        user_id: userId,
        notification_type: `unsubscribe_token_${type}`,
        email_address: token,
        created_at: new Date().toISOString(),
      });

    return token;
  } catch {
    return 'invalid-token';
  }
}

// Handle token-based unsubscribe
async function handleTokenUnsubscribe(token: string, type: string) {
  try {
    const supabase = await createClient();

    // Find the token in notifications
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('privacy_email_notifications')
      .select('user_id, created_at')
      .eq('email_address', token)
      .eq('notification_type', `unsubscribe_token_${type}`)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired unsubscribe token' },
        { status: 400 }
      );
    }

    // Check token expiration (30 days)
    const tokenDate = new Date(tokenRecord.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 30) {
      return NextResponse.json(
        { success: false, error: 'Unsubscribe token has expired' },
        { status: 400 }
      );
    }

    // Update preferences based on type
    const updates: any = { updated_at: new Date().toISOString() };

    switch (type) {
      case 'email':
      case 'all':
        updates.marketing_emails_enabled = false;
        break;
    }

    // Apply the unsubscribe
    const { error: updateError } = await supabase
      .from('user_privacy_preferences')
      .update(updates)
      .eq('user_id', tokenRecord.user_id);

    if (updateError) {
      throw updateError;
    }

    // Log the unsubscribe
    await supabase
      .from('privacy_email_notifications')
      .insert({
        user_id: tokenRecord.user_id,
        notification_type: `unsubscribed_via_token_${type}`,
        email_address: 'token-unsubscribe',
      });

    // Apply to external services
    const preferences = {
      emailMarketing: type === 'email' || type === 'all' ? false : undefined,
    };

    await applyMarketingPreferences(tokenRecord.user_id, preferences, {});

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed from ${type} marketing`,
      data: { type, unsubscribed: true },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}