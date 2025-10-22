import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Strong password validation schema
const SignUpSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  profile: z.object({
    name: z.string()
      .min(1, 'Name is required')
      .max(100, 'Name too long')
      .trim(),
    pronouns: z.string()
      .max(50, 'Pronouns too long')
      .optional(),
    color_theme: z.enum([
      'emerald', 'blue', 'purple', 'pink', 'orange', 'rose',
      'cyan', 'amber', 'indigo', 'teal', 'red', 'lime',
      'fuchsia', 'violet', 'sky', 'mint', 'coral', 'lavender', 'sage', 'slate'
    ]).optional(),
    space_name: z.string()
      .min(1, 'Space name is required')
      .max(100, 'Space name too long')
      .trim()
      .optional(),
    marketing_emails_enabled: z.boolean().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    // Extract IP for rate limiting
    const ip = extractIP(request.headers);

    // Apply rate limiting (more restrictive for signup: 3 attempts per hour)
    const { success, limit, remaining, reset } = authRateLimit
      ? await authRateLimit.limit(ip)
      : { success: true, limit: 3, remaining: 2, reset: Date.now() + 3600000 };

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many signup attempts. Please try again later.',
          resetTime: reset
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = SignUpSchema.parse(body);

    // Sanitize profile data to prevent XSS
    const sanitizedProfile = {
      ...validated.profile,
      name: DOMPurify.sanitize(validated.profile.name, { ALLOWED_TAGS: [] }),
      pronouns: validated.profile.pronouns
        ? DOMPurify.sanitize(validated.profile.pronouns, { ALLOWED_TAGS: [] })
        : undefined,
      space_name: validated.profile.space_name
        ? DOMPurify.sanitize(validated.profile.space_name, { ALLOWED_TAGS: [] })
        : undefined,
    };

    // Create Supabase client
    const supabase = createClient();

    // Attempt signup with Supabase
    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          name: sanitizedProfile.name,
          pronouns: sanitizedProfile.pronouns,
          color_theme: sanitizedProfile.color_theme || 'purple',
          space_name: sanitizedProfile.space_name,
          marketing_emails_enabled: sanitizedProfile.marketing_emails_enabled ?? false,
        },
      },
    });

    if (error) {
      // Handle specific signup errors
      if (error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      if (error.message.includes('Invalid email')) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }

      if (error.message.includes('Password')) {
        return NextResponse.json(
          { error: 'Password does not meet requirements' },
          { status: 400 }
        );
      }

      // Generic error for other cases
      console.error('Signup error:', error);
      return NextResponse.json(
        { error: 'Account creation failed. Please try again.' },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        user: data.user,
        session: data.session,
        message: data.user?.email_confirmed_at
          ? 'Account created successfully'
          : 'Account created. Please check your email to verify your account.'
      },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.issues[0].message
        },
        { status: 400 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Generic error handler
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}