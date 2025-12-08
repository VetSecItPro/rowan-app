import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const BETA_PASSWORD = 'rowan-beta-2024';

// Validation schema
const betaSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  betaPassword: z.string().min(1, 'Beta password is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = betaSignupSchema.parse(body);

    // Verify beta password
    if (validatedData.betaPassword !== BETA_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid beta testing password' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Create user account with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          full_name: validatedData.fullName,
          display_name: validatedData.fullName,
          is_beta_tester: true // Mark as beta tester in auth metadata
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
      );
    }

    // Update user record with beta tester information
    // This will be handled by the auth trigger, but we can also ensure it here
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_beta_tester: true,
        beta_status: 'approved', // Automatically approve beta testers
        beta_signup_date: new Date().toISOString(),
        full_name: validatedData.fullName,
        display_name: validatedData.fullName
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Error updating user with beta status:', updateError);
      // Don't fail the request, as the auth creation succeeded
      // The auth trigger should handle this, but we'll log the error
    }

    // Log beta tester activity
    const { error: activityError } = await supabase
      .from('beta_tester_activity')
      .insert({
        user_id: authData.user.id,
        activity_type: 'beta_signup',
        page_url: '/beta-signup',
        device_info: {
          user_agent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      });

    if (activityError) {
      console.error('Error logging beta activity:', activityError);
      // Don't fail the request for logging errors
    }

    return NextResponse.json({
      success: true,
      message: 'Beta tester account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        is_beta_tester: true
      }
    });

  } catch (error) {
    console.error('Beta signup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues.map((issue: z.ZodIssue) => issue.message)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}