import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const settings = await request.json();

    // Here you would normally save privacy data settings
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Privacy data settings updated',
      data: settings,
    });
  } catch (error) {
    logger.error('Error updating privacy data settings:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to update privacy data settings' },
      { status: 500 }
    );
  }
}