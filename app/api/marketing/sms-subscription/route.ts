import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const SmsSubscriptionSchema = z.object({
  phone: z.string().min(6).max(32),
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
    const body = await req.json();
    const parsed = SmsSubscriptionSchema.safeParse(body);
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

    const { phone, subscribed, userId } = parsed.data;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone_number')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.phone_number && profile.phone_number !== phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number does not match user profile' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('user_privacy_preferences')
      .upsert(
        {
          user_id: userId,
          marketing_sms_enabled: subscribed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      logger.error('Failed to update SMS subscription preference', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('SMS subscription API error', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
