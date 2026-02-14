import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for cookie preferences
const CookiePreferencesSchema = z.object({
  preferences: z.object({
    essential: z.boolean().optional(),
    analytics: z.boolean().optional(),
    marketing: z.boolean().optional(),
    preferences: z.boolean().optional(),
  }).strict(),
}).strict();

/** Retrieves current cookie consent preferences */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Return basic cookie information/status
    return NextResponse.json({
      success: true,
      data: {
        essential: true,
        analytics: false,
        marketing: false,
        preferences: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching cookie status:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch cookie status' },
      { status: 500 }
    );
  }
}

/** Updates cookie consent preferences */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const validationResult = CookiePreferencesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { preferences } = validationResult.data;

    // Here you would normally save cookie preferences
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Cookie preferences updated',
      data: preferences,
    });
  } catch (error) {
    logger.error('Error updating cookie preferences:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to update cookie preferences' },
      { status: 500 }
    );
  }
}