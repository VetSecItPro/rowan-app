import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { uploadAvatar } from '@/lib/services/storage-service';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateImageMagicBytes, isFormatAllowed, ALLOWED_AVATAR_FORMATS } from '@/lib/utils/file-validation';
import { logger } from '@/lib/logger';

// Avatar file size limit: 5MB
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum avatar size is 5MB.' },
        { status: 400 }
      );
    }

    // Validate MIME type first (quick check)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // SECURITY: Validate magic bytes to prevent disguised malicious files
    const validation = await validateImageMagicBytes(file);
    if (!validation.valid) {
      logger.warn('Avatar upload rejected: invalid magic bytes', {
        component: 'api/upload/avatar',
        action: 'magic_bytes_validation_failed',
        declaredMime: file.type,
      });
      return NextResponse.json(
        { error: 'File does not appear to be a valid image' },
        { status: 400 }
      );
    }

    // Validate format is allowed for avatars
    if (!isFormatAllowed(validation.format!, ALLOWED_AVATAR_FORMATS)) {
      return NextResponse.json(
        { error: `Image format ${validation.format} is not allowed. Please use JPEG, PNG, WebP, or GIF.` },
        { status: 400 }
      );
    }

    // Upload avatar using storage service
    const result = await uploadAvatar(file, user.id);

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
    logger.error('Avatar upload error', error, { component: 'api/upload/avatar', action: 'upload' });
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
