import { NextRequest, NextResponse } from 'next/server';
import { geographicDetectionService } from '@/lib/services/geographic-detection-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { z } from 'zod';

// Zod schema for manual location input
const ManualLocationSchema = z.object({
  city: z.string().min(1).max(200),
  region: z.string().min(1).max(200),
  country: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().max(100).optional(),
}).strict();

// Force dynamic rendering for this route since it uses request data
export const dynamic = 'force-dynamic';

/**
 * User Location Detection API for Weather Service
 *
 * Automatically detects user's location using IP geolocation
 * to provide relevant weather information when no specific
 * event location is provided.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get client IP address
    const clientIP = geographicDetectionService.getClientIP(request);

    if (clientIP === 'unknown') {
      return NextResponse.json(
        {
          error: 'Unable to determine location from IP address',
          fallback: {
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            latitude: 0,
            longitude: 0,
            timezone: 'UTC'
          }
        },
        { status: 400 }
      );
    }

    // Detect geographic location
    const detection = await geographicDetectionService.detectLocation(clientIP);

    if (!detection.success || !detection.data) {
      return NextResponse.json(
        {
          error: detection.error || 'Failed to detect location',
          fallback: {
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            latitude: 0,
            longitude: 0,
            timezone: 'UTC'
          }
        },
        { status: 500 }
      );
    }

    const locationData = detection.data;

    // Format location data for weather service use
    const weatherLocation = {
      success: true,
      location: {
        city: locationData.city,
        region: locationData.region,
        country: locationData.country,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timezone: locationData.timezone,
        // Create a formatted location string for weather queries
        formatted: `${locationData.city}, ${locationData.region}`,
        // Provide backup location strings
        cityOnly: locationData.city,
        regionOnly: locationData.region,
        countryOnly: locationData.country,
      },
      confidence: detection.confidence,
      detectedAt: new Date().toISOString(),
      ip: clientIP
    };

    return NextResponse.json(weatherLocation);
  } catch {
    return NextResponse.json(
      {
        error: 'Internal server error during location detection',
        fallback: {
          city: 'Unknown',
          region: 'Unknown',
          country: 'Unknown',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Optional POST endpoint for manual location override
 * Allows users to manually set their preferred location
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const validationResult = ManualLocationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { city, region, country, latitude, longitude, timezone } = validationResult.data;

    const manualLocation = {
      success: true,
      location: {
        city,
        region,
        country,
        latitude: latitude || 0,
        longitude: longitude || 0,
        timezone: timezone || 'UTC',
        formatted: `${city}, ${region}`,
        cityOnly: city,
        regionOnly: region,
        countryOnly: country,
      },
      confidence: 'high' as const,
      detectedAt: new Date().toISOString(),
      source: 'manual_override'
    };

    return NextResponse.json(manualLocation);
  } catch {
    return NextResponse.json(
      { error: 'Failed to process manual location' },
      { status: 500 }
    );
  }
}