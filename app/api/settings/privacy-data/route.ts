import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const PrivacyDataSettingsSchema = z.object({
  dataProcessing: z.object({
    analytics: z.boolean(),
    marketing: z.boolean(),
    functional: z.boolean(),
    essential: z.boolean(),
  }).strict(),
  dataRetention: z.object({
    messages: z.string().min(1).max(50),
    analytics: z.string().min(1).max(50),
    logs: z.string().min(1).max(50),
  }).strict(),
  dataSources: z.object({
    browser: z.boolean(),
    device: z.boolean(),
    location: z.boolean(),
    thirdParty: z.boolean(),
  }).strict(),
}).strict();

/** Retrieves the user's privacy and data processing settings */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return privacy data settings/status
    return NextResponse.json({
      success: true,
      data: {
        dataProcessing: {
          analytics: false,
          marketing: false,
          functional: true,
          essential: true,
        },
        dataRetention: {
          messages: '1 year',
          analytics: '6 months',
          logs: '30 days',
        },
        dataSources: {
          browser: true,
          device: false,
          location: false,
          thirdParty: false,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching privacy data settings:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch privacy data settings' },
      { status: 500 }
    );
  }
}

/** Updates the user's privacy and data processing settings */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedSettings = PrivacyDataSettingsSchema.parse(body);

    // Here you would normally save privacy data settings
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Privacy data settings updated',
      data: parsedSettings,
    });
  } catch (error) {
    logger.error('Error updating privacy data settings:', error, { component: 'api-route', action: 'api_request' });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update privacy data settings' },
      { status: 500 }
    );
  }
}
