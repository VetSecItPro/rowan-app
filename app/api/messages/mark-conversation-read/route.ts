import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schema for mark conversation read
const markConversationReadSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Parse and validate request body with Zod
    const body = await request.json();
    const validation = markConversationReadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { conversationId } = validation.data;

    // Verify the user is authenticated
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // SECURITY: Verify user has access to this conversation's space
    const { data: conversation, error: convError } = await supabaseAdmin
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

    // Verify user is a member of this space
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('space_members')
      .select('id')
      .eq('space_id', conversation.space_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Mark all unread messages in this conversation as read (except user's own messages)
    const { data, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', user.id)
      .select('id');

    if (updateError) {
      logger.error('Failed to mark conversation as read:', updateError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to mark messages as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      markedCount: data?.length || 0
    });
  } catch (error) {
    logger.error('Error in mark-conversation-read:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
