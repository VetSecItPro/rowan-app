import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { messagesService } from '@/lib/services/messages-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { checkUsageLimit, trackUsage } from '@/lib/middleware/usage-check';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withDynamicDataCache } from '@/lib/utils/cache-headers';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';

const isSafeHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Zod schemas for validation
const GetMessagesQuerySchema = z.object({
  conversation_id: z.string().uuid('Invalid conversation ID format'),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.string().datetime().optional(),
});

const CreateMessageSchema = z.object({
  space_id: z.string().uuid('Invalid space ID format'),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message content too long'),
  conversation_id: z.string().uuid('Invalid conversation ID format').nullable().optional().transform(v => v ?? null),
  parent_message_id: z.string().uuid('Invalid parent message ID format').optional(),
  attachments: z.array(z.string().refine(isSafeHttpUrl, 'Invalid attachment URL')).optional(),
});

/**
 * GET /api/messages
 * Get all messages for a conversation
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

    // Get and validate conversation_id from query params
    const { searchParams } = new URL(req.url);
    const queryParams = {
      conversation_id: searchParams.get('conversation_id') || '',
      ...(searchParams.get('limit') && { limit: searchParams.get('limit') }),
      ...(searchParams.get('before') && { before: searchParams.get('before') }),
    };

    const validationResult = GetMessagesQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { conversation_id: conversationId, limit, before } = validationResult.data;

    // SECURITY FIX (VULN-IDOR-001): Verify space access before returning messages.
    // Look up the conversation's space_id and check that the caller is a member.
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('space_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    try {
      await verifySpaceAccess(user.id, conversation.space_id);
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Get messages from service (cursor-based pagination)
    const result = await messagesService.getMessages(
      conversationId,
      { limit, before },
      supabase,
    );

    // Use shorter cache for real-time messaging data
    return withDynamicDataCache(
      NextResponse.json({
        success: true,
        data: result.messages,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      })
    );
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

    logger.error('Messages GET error', error, { component: 'api/messages', action: 'get' });
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

    // Check daily message limit
    const usageCheck = await checkUsageLimit(user.id, 'messages_sent');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily message limit reached',
          message: usageCheck.message,
          currentUsage: usageCheck.currentUsage,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          upgradeRequired: true,
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = CreateMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const sanitizedContent = sanitizePlainText(validationResult.data.content);
    if (!sanitizedContent) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const sanitizedAttachments = validationResult.data.attachments
      ? validationResult.data.attachments.map((url) => sanitizeUrl(url))
      : undefined;

    if (sanitizedAttachments && sanitizedAttachments.some((url) => !url)) {
      return NextResponse.json(
        { error: 'Invalid attachment URL' },
        { status: 400 }
      );
    }

    const { space_id } = validationResult.data;

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, space_id);
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

    // Create message using service with validated data
    const message = await messagesService.createMessage({
      ...validationResult.data,
      content: sanitizedContent,
      attachments: sanitizedAttachments,
      sender_id: user.id,
    }, supabase);

    // Track message usage
    await trackUsage(user.id, 'messages_sent');

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error('Messages POST error', error, { component: 'api/messages', action: 'post' });
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
