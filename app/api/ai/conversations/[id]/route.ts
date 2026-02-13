/**
 * GET/DELETE /api/ai/conversations/[id]
 *
 * Get conversation messages or delete a conversation.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  getConversation,
  getMessages,
  deleteConversation,
} from '@/lib/services/ai/conversation-persistence-service';
import { featureFlags } from '@/lib/constants/feature-flags';
import { validateAIAccess, buildAIAccessDeniedResponse } from '@/lib/services/ai/ai-access-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!featureFlags.isAICompanionEnabled()) {
      return Response.json({ error: 'AI companion is not enabled' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // AI access check (tier only, no budget check for reading conversations)
    const aiAccess = await validateAIAccess(supabase, user.id, undefined, false);
    if (!aiAccess.allowed) {
      return buildAIAccessDeniedResponse(aiAccess);
    }

    const { id } = await params;

    // Get conversation (RLS ensures user ownership)
    const conversation = await getConversation(supabase, id);
    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50'), 100);
    const offset = Math.max(parseInt(req.nextUrl.searchParams.get('offset') ?? '0'), 0);

    const messages = await getMessages(supabase, id, limit, offset);

    return Response.json({
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    logger.error('[API] /api/ai/conversations/[id] GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!featureFlags.isAICompanionEnabled()) {
      return Response.json({ error: 'AI companion is not enabled' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // AI access check (tier only)
    const aiAccess = await validateAIAccess(supabase, user.id, undefined, false);
    if (!aiAccess.allowed) {
      return buildAIAccessDeniedResponse(aiAccess);
    }

    const { id } = await params;

    // Verify conversation exists (RLS handles ownership)
    const conversation = await getConversation(supabase, id);
    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    await deleteConversation(supabase, id);
    return Response.json({ success: true });
  } catch (error) {
    logger.error('[API] /api/ai/conversations/[id] DELETE error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
