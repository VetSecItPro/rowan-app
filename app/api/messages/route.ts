import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { messagesService } from '@/lib/services/messages-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';

/**
 * GET /api/messages
 * Get all messages for a conversation
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting (with graceful fallback)
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
      // Continue if rate limiting fails
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Get conversation_id from query params
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }


    // Get messages from service
    const messages = await messagesService.getMessages(conversationId);

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/messages',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

    console.error('[API] /api/messages GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Create a new message
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting (with graceful fallback)
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
      // Continue if rate limiting fails
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Parse request body
    const body = await req.json();
    const { space_id, content } = body;

    // Validate required fields
    if (!space_id || !content) {
      return NextResponse.json(
        { error: 'space_id and content are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(session.user.id, space_id);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/messages',
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

    // Create message using service
    const message = await messagesService.createMessage({
      ...body,
      sender_id: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('[API] /api/messages POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
