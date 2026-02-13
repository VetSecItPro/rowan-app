/**
 * POST /api/ai/feedback
 *
 * Submit feedback (thumbs up/down) for an AI message.
 * Stores feedback + optional text in ai_messages table.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  feedback: z.enum(['positive', 'negative']),
  feedbackText: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { messageId, conversationId, feedback, feedbackText } = parsed.data;

    // Verify the conversation belongs to this user (RLS handles this, but be explicit)
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Update the message with feedback
    const { error: updateError } = await supabase
      .from('ai_messages')
      .update({
        feedback,
        feedback_text: feedbackText ?? null,
      })
      .eq('id', messageId)
      .eq('conversation_id', conversationId);

    if (updateError) {
      logger.error('[AI Feedback] Failed to save feedback', updateError);
      return Response.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    logger.error('[AI Feedback] Unhandled error', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
