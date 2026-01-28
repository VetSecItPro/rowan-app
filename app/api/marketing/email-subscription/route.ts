import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

const EmailSubscriptionSchema = z.object({
  email: z.string().email(),
  subscribed: z.boolean(),
  userId: z.string().uuid(),
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
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = EmailSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await resolveRequestUser(req);
    if (!user || user.id !== parsed.data.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { email, subscribed, userId } = parsed.data;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.email && profile.email !== email) {
      return NextResponse.json(
        { success: false, error: 'Email does not match user profile' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('user_privacy_preferences')
      .upsert(
        {
          user_id: userId,
          marketing_emails_enabled: subscribed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      logger.error('Failed to update email subscription preference', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Email subscription API error', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
