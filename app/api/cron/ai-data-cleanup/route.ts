/**
 * Vercel Cron Job: AI Data Cleanup
 *
 * Deletes AI conversations and messages older than 90 days.
 * Runs daily at 3:00 AM UTC (configured in vercel.json).
 *
 * Uses the admin Supabase client to bypass RLS and delete
 * across all users/spaces.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/security/verify-secret';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RETENTION_DAYS = 90;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (!verifyCronSecret(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  const cutoffIso = cutoffDate.toISOString();

  let deletedConversations = 0;
  let deletedMessages = 0;

  try {
    // 1. Find conversations older than retention period
    const { data: oldConversations, error: findError } = await supabaseAdmin
      .from('ai_conversations')
      .select('id')
      .lt('last_message_at', cutoffIso);

    if (findError) {
      logger.error('[AI Cleanup] Failed to find old conversations', findError);
      return NextResponse.json({ error: 'Failed to find old conversations' }, { status: 500 });
    }

    const conversationIds = (oldConversations ?? []).map((c: { id: string }) => c.id);

    if (conversationIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No conversations older than 90 days',
        deleted: { conversations: 0, messages: 0 },
      });
    }

    // 2. Delete messages in old conversations (batch to avoid timeout)
    const batchSize = 100;
    for (let i = 0; i < conversationIds.length; i += batchSize) {
      const batch = conversationIds.slice(i, i + batchSize);
      const { error: msgError } = await supabaseAdmin
        .from('ai_messages')
        .delete()
        .in('conversation_id', batch);

      if (msgError) {
        logger.error('[AI Cleanup] Failed to delete messages batch', msgError);
      } else {
        deletedMessages += batch.length; // Approximate count
      }
    }

    // 3. Delete the conversations themselves
    for (let i = 0; i < conversationIds.length; i += batchSize) {
      const batch = conversationIds.slice(i, i + batchSize);
      const { error: convError } = await supabaseAdmin
        .from('ai_conversations')
        .delete()
        .in('id', batch);

      if (convError) {
        logger.error('[AI Cleanup] Failed to delete conversations batch', convError);
      } else {
        deletedConversations += batch.length;
      }
    }

    // 4. Delete old usage data (older than 180 days — keep longer for analytics)
    const usageCutoff = new Date();
    usageCutoff.setDate(usageCutoff.getDate() - 180);
    const usageCutoffDate = usageCutoff.toISOString().split('T')[0];

    await supabaseAdmin
      .from('ai_usage_daily')
      .delete()
      .lt('date', usageCutoffDate);

    logger.info('[AI Cleanup] Data cleanup complete', {
      component: 'ai-cleanup',
      action: 'cleanup_complete',
      deletedConversations,
      deletedMessages,
      retentionDays: RETENTION_DAYS,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        conversations: deletedConversations,
        messages: deletedMessages,
      },
      retention_days: RETENTION_DAYS,
    });
  } catch (err) {
    logger.error('[AI Cleanup] Unhandled error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
