import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectsOnlyService } from '@/lib/services/projects-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { createProjectSchema } from '@/lib/validations/project-schemas';
import { sanitizePlainText } from '@/lib/sanitize';
import { withUserDataCache } from '@/lib/utils/cache-headers';

/**
 * GET /api/projects
 * Get all projects for a space
 */
export async function GET(req: NextRequest) {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }


    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, spaceId);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/projects',
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

    // Get projects from service
    const projects = await projectsOnlyService.getProjects(spaceId);

    return withUserDataCache(
      NextResponse.json({
        success: true,
        data: projects,
      })
    );
  } catch (error) {
    logger.error('[API] /api/projects GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Parse and validate request body with Zod
    const body = await req.json();
    try {
      createProjectSchema.parse({
        ...body,
        created_by: user.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    const { space_id, name, description, status, start_date, target_date, budget_amount } = body;

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, space_id);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/projects',
        method: 'POST',
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

    // Create project using service with sanitized inputs
    const project = await projectsOnlyService.createProject({
      space_id,
      name: sanitizePlainText(name),
      description: description ? sanitizePlainText(description) : undefined,
      status,
      start_date,
      target_date,
      budget_amount,
    });

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('[API] /api/projects POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
