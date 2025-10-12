import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SignUpSchema } from '@/lib/schemas/auth';
import { ratelimit } from '@/lib/ratelimit';

/**
 * POST /api/auth/signup
 * Server-side signup with password validation
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Rate limiting failed, continue without it
    }

    // Parse and validate request body
    const body = await req.json();

    // SERVER-SIDE VALIDATION: Validate with Zod schema
    const validation = SignUpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const { email, password, name, pronouns, color_theme, space_name } = validation.data;

    // Create user with Supabase Auth
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          pronouns,
          color_theme,
          space_name,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: data.user,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
