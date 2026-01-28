import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

const NotificationLogSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['email', 'push']),
  category: z.enum(['reminder', 'task', 'shopping', 'meal', 'event', 'message', 'digest']),
  subject: z.string().min(1).max(200),
  status: z.enum(['sent', 'failed', 'bounced']),
  errorMessage: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = NotificationLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.id !== parsed.data.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('notification_log')
      .insert({
        user_id: parsed.data.userId,
        type: parsed.data.type,
        category: parsed.data.category,
        subject: parsed.data.subject,
        status: parsed.data.status,
        error_message: parsed.data.errorMessage,
      });

    if (error) {
      logger.error('Notification log insert failed', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to log notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Notification log API error', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
