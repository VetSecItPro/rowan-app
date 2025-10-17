import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's privacy settings
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('privacy_settings')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching privacy settings:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch privacy settings' },
        { status: 500 }
      );
    }

    // Default privacy settings if none exist
    const defaultSettings = {
      profileVisibility: true,
      activityStatus: true,
      readReceipts: true,
      analytics: true,
    };

    const privacySettings = userProfile?.privacy_settings || defaultSettings;

    return NextResponse.json({
      success: true,
      data: privacySettings,
    });
  } catch (error) {
    console.error('Error in privacy settings GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
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

    // Get current privacy settings
    const { data: userProfile, error: fetchError } = await supabase
      .from('users')
      .select('privacy_settings')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching current privacy settings:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current settings' },
        { status: 500 }
      );
    }

    // Merge with existing settings
    const currentSettings = userProfile?.privacy_settings || {
      profileVisibility: true,
      activityStatus: true,
      readReceipts: true,
      analytics: true,
    };

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
      console.error('Error updating privacy settings:', updateError);
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
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in privacy settings PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}