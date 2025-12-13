import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';

/**
 * Privacy Settings API
 *
 * Handles user privacy preferences including:
 * - Profile visibility
 * - Activity status
 * - Read receipts
 * - Analytics sharing
 */

const PrivacySettingsSchema = z.object({
  profileVisibility: z.boolean().optional(),
  activityStatus: z.boolean().optional(),
  readReceipts: z.boolean().optional(),
  analytics: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Default privacy settings if none exist
    const defaultSettings = {
      profileVisibility: true,
      activityStatus: true,
      readReceipts: true,
      analytics: true,
    };

    // Get user's privacy settings
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('privacy_settings')
      .eq('id', user.id)
      .single();

    // If column doesn't exist yet, return default settings
    if (profileError && profileError.message?.includes('column "privacy_settings" does not exist')) {
      return NextResponse.json({
        success: true,
        data: defaultSettings,
      });
    }

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch privacy settings' },
        { status: 500 }
      );
    }

    const privacySettings = userProfile?.privacy_settings || defaultSettings;

    return NextResponse.json({
      success: true,
      data: privacySettings,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = PrivacySettingsSchema.parse(body);

    // Default privacy settings if none exist
    const defaultSettings = {
      profileVisibility: true,
      activityStatus: true,
      readReceipts: true,
      analytics: true,
    };

    // Get current privacy settings
    const { data: userProfile, error: fetchError } = await supabase
      .from('users')
      .select('privacy_settings')
      .eq('id', user.id)
      .single();

    // If column doesn't exist yet, return error for now (updates not supported without column)
    if (fetchError && fetchError.message?.includes('column "privacy_settings" does not exist')) {
      return NextResponse.json(
        { error: 'Privacy settings feature not yet available' },
        { status: 503 }
      );
    }

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch current settings' },
        { status: 500 }
      );
    }

    // Merge with existing settings
    const currentSettings = userProfile?.privacy_settings || defaultSettings;

    const updatedSettings = {
      ...currentSettings,
      ...validatedData,
    };

    // Update privacy settings
    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        privacy_settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('privacy_settings')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update privacy settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.privacy_settings,
      message: 'Privacy settings updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}