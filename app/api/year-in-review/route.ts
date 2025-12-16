import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { yearInReviewService } from '@/lib/services/year-in-review-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';

/**
 * GET /api/year-in-review
 * Generate comprehensive year in review data for a user's space
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('space_id');
    const year = searchParams.get('year');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Verify user has access to the space
    try {
      await verifySpaceAccess(session.user.id, spaceId);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          endpoint: '/api/year-in-review',
          method: 'GET',
        },
        extra: {
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Parse year (default to current year)
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    if (isNaN(targetYear) || targetYear < 2020 || targetYear > new Date().getFullYear()) {
      return NextResponse.json(
        { error: 'Invalid year provided' },
        { status: 400 }
      );
    }

    logger.info('[API] Generating year in review', {
      userId: session.user.id,
      spaceId,
      year: targetYear,
      component: 'YearInReviewAPI',
      action: 'GET',
    });

    // Generate year in review data
    const yearInReviewData = await yearInReviewService.generateYearInReview(
      supabase,
      session.user.id,
      spaceId,
      targetYear
    );

    logger.info('[API] Year in review generated successfully', {
      userId: session.user.id,
      spaceId,
      year: targetYear,
      tasksCompleted: yearInReviewData.overview.tasksCompleted,
      goalsAchieved: yearInReviewData.overview.goalsAchieved,
      component: 'YearInReviewAPI',
      action: 'GET',
    });

    return NextResponse.json({
      success: true,
      data: yearInReviewData,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/year-in-review',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

    logger.error('[API] /api/year-in-review GET error', error, {
      component: 'YearInReviewAPI',
      action: 'GET',
    });

    return NextResponse.json(
      { error: 'Failed to generate year in review' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/year-in-review/export
 * Export year in review data as PDF or other formats
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    const body = await request.json();
    const { space_id, year, format = 'pdf' } = body;

    if (!space_id) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Verify user has access to the space
    try {
      await verifySpaceAccess(session.user.id, space_id);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Parse year (default to current year)
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    if (isNaN(targetYear) || targetYear < 2020 || targetYear > new Date().getFullYear()) {
      return NextResponse.json(
        { error: 'Invalid year provided' },
        { status: 400 }
      );
    }

    logger.info('[API] Exporting year in review', {
      userId: session.user.id,
      spaceId: space_id,
      year: targetYear,
      format,
      component: 'YearInReviewAPI',
      action: 'POST_EXPORT',
    });

    // Generate year in review data
    const yearInReviewData = await yearInReviewService.generateYearInReview(
      supabase,
      session.user.id,
      space_id,
      targetYear
    );

    // For now, return JSON data (would implement PDF generation later)
    // TODO: Implement PDF generation using libraries like puppeteer or jsPDF

    return NextResponse.json({
      success: true,
      message: 'Year in review export prepared',
      data: yearInReviewData,
      downloadUrl: null, // Would provide actual download URL after PDF generation
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/year-in-review',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

    logger.error('[API] /api/year-in-review POST error', error, {
      component: 'YearInReviewAPI',
      action: 'POST',
    });

    return NextResponse.json(
      { error: 'Failed to export year in review' },
      { status: 500 }
    );
  }
}