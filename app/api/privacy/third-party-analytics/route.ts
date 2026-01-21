import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const ThirdPartyAnalyticsSchema = z.object({
  userId: z.string().uuid().optional(),
  enabled: z.boolean(),
});

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) {
      return data.user;
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ThirdPartyAnalyticsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const targetUserId = parsed.data.userId || user.id;
    if (targetUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('user_privacy_preferences')
      .upsert(
        {
          user_id: targetUserId,
          third_party_analytics_enabled: parsed.data.enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      logger.error('Failed to update third-party analytics preference', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to update preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Third-party analytics API error', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
