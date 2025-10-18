import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { uploadAvatar } from '@/lib/services/storage-service';
import { extractIP } from '@/lib/ratelimit-fallback';

/**
 * POST /api/upload/avatar
 * Upload user avatar image
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Upload avatar using storage service
    const result = await uploadAvatar(file, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to upload avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/upload/avatar',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/upload/avatar POST error:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
