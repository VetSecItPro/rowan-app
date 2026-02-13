import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { uploadRecipeImage } from '@/lib/services/storage-service';
import { validateImageMagicBytes, isFormatAllowed, ALLOWED_RECIPE_FORMATS } from '@/lib/utils/file-validation';
import { logger } from '@/lib/logger';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';

// Recipe image file size limit: 10MB
const MAX_RECIPE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/upload/recipe
 * Upload recipe image
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

    // Verify subscription tier for photo uploads
    const tierCheck = await canAccessFeature(user.id, 'canUploadPhotos', supabase);
    if (!tierCheck.allowed) {
      return buildUpgradeResponse('canUploadPhotos', tierCheck.tier ?? 'free');
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
    if (file.size > MAX_RECIPE_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum recipe image size is 10MB.' },
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
      logger.warn('Recipe image upload rejected: invalid magic bytes', {
        component: 'api/upload/recipe',
        action: 'magic_bytes_validation_failed',
        declaredMime: file.type,
      });
      return NextResponse.json(
        { error: 'File does not appear to be a valid image' },
        { status: 400 }
      );
    }

    // Validate format is allowed for recipes
    if (!isFormatAllowed(validation.format!, ALLOWED_RECIPE_FORMATS)) {
      return NextResponse.json(
        { error: `Image format ${validation.format} is not allowed. Please use JPEG, PNG, WebP, GIF, AVIF, or HEIC.` },
        { status: 400 }
      );
    }

    // Upload recipe image using storage service
    const result = await uploadRecipeImage(file, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to upload recipe image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      path: result.path,
      message: 'Recipe image uploaded successfully',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/upload/recipe',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('Recipe image upload error', error, { component: 'api/upload/recipe', action: 'upload' });
    return NextResponse.json(
      { error: 'Failed to upload recipe image' },
      { status: 500 }
    );
  }
}
