import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteSpace } from '@/lib/services/spaces-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const SpaceParamsSchema = z.object({
  spaceId: z.string().uuid('Invalid space ID format'),
});

const DeleteSpaceBodySchema = z.object({
  confirmation: z.literal('DELETE_SPACE'),
  spaceName: z.string().min(1, 'Space name is required for confirmation'),
});

/**
 * DELETE /api/spaces/[spaceId]/delete
 * Delete a space (owner only)
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ spaceId: string }> }) {
  const params = await props.params;
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(req);
    if (csrfError) return csrfError;

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

    const paramsParsed = SpaceParamsSchema.safeParse(params);
    if (!paramsParsed.success) {
      return NextResponse.json({ error: 'Invalid Space ID format' }, { status: 400 });
    }
    const { spaceId } = paramsParsed.data;

    // Parse and validate request body
    const body = await req.json();
    const bodyParsed = DeleteSpaceBodySchema.safeParse(body);
    if (!bodyParsed.success) {
      return NextResponse.json(
        { error: 'Invalid request. Confirmation and space name are required.' },
        { status: 400 }
      );
    }
    const { spaceName } = bodyParsed.data;

    // First, get the space details
    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .select('id, name')
      .eq('id', spaceId)
      .single();

    if (spaceError || !space) {
      return NextResponse.json(
        { error: 'Space not found' },
        { status: 404 }
      );
    }

    // Then, verify user is owner of this space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Access denied - you are not a member of this space' },
        { status: 403 }
      );
    }

    // SECURITY: Verify user is owner
    if (membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only space owners can delete spaces' },
        { status: 403 }
      );
    }

    // SECURITY: Verify space name matches exactly
    if (space.name.trim() !== spaceName.trim()) {
      return NextResponse.json(
        { error: 'Space name does not match. Please enter the exact space name.' },
        { status: 400 }
      );
    }

    // Delete the space using service layer
    const result = await deleteSpace(spaceId, user.id, supabase);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Log the deletion for audit purposes
    Sentry.addBreadcrumb({
      message: 'Space deleted',
      level: 'info',
      data: {
        spaceId,
        spaceName: space.name,
        userId: user.id,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Space deleted successfully'
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/spaces/[spaceId]/delete',
        method: 'DELETE',
      },
      extra: {
        spaceId: params.spaceId,
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/spaces/[spaceId]/delete error:', error, {
      component: 'SpaceDeleteAPI',
      action: 'DELETE',
      spaceId: params.spaceId,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
