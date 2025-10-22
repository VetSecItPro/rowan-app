import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ratelimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { z } from 'zod';

// Rate limiting: 5 signin attempts per hour per IP
const signinRateLimit = ratelimit({
  name: 'auth_signin',
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});

// Input validation schema
const SignInSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

export async function POST(request: NextRequest) {
  try {
    // Extract IP for rate limiting
    const ip = extractIP(request.headers);

    // Apply rate limiting
    const { success, limit, remaining, resetTime } = await signinRateLimit(ip);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many signin attempts. Please try again later.',
          resetTime
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = SignInSchema.parse(body);

    // Create Supabase client
    const supabase = createClient();

    // Attempt signin with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      // Don't expose specific error details to prevent user enumeration
      const isInvalidCredentials = error.message.includes('Invalid login credentials') ||
                                   error.message.includes('Email not confirmed') ||
                                   error.message.includes('Invalid password');

      if (isInvalidCredentials) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // For other errors (rate limits, server issues, etc)
      return NextResponse.json(
        { error: 'Authentication failed. Please try again.' },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        user: data.user,
        session: data.session
      },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString(),
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
    console.error('Signin API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}