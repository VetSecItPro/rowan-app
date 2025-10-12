import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { messagesService } from '@/lib/services/messages-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifyResourceAccess } from '@/lib/services/authorization-service';

/**
 * GET /api/messages/[id]
 * Get a single message by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get message
    const message = await messagesService.getMessageById(params.id);

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify user has access to message's space
    try {
      await verifyResourceAccess(session.user.id, message);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this message' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('[API] /api/messages/[id] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messages/[id]
 * Update a message
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get existing message first
    const existingMessage = await messagesService.getMessageById(params.id);

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify user has access to message's space
    try {
      await verifyResourceAccess(session.user.id, existingMessage);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this message' },
        { status: 403 }
      );
    }

    // Parse request body
    const updates = await req.json();

    // Update message using service
    const updatedMessage = await messagesService.updateMessage(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    console.error('[API] /api/messages/[id] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/[id]
 * Delete a message
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get existing message first
    const existingMessage = await messagesService.getMessageById(params.id);

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify user has access to message's space
    try {
      await verifyResourceAccess(session.user.id, existingMessage);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this message' },
        { status: 403 }
      );
    }

    // Delete message using service
    await messagesService.deleteMessage(params.id);

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('[API] /api/messages/[id] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
