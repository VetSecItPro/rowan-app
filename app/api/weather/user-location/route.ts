import { NextRequest, NextResponse } from 'next/server';
import { geographicDetectionService } from '@/lib/services/geographic-detection-service';

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
    const body = await request.json();
    const { city, region, country, latitude, longitude } = body;

    // Validate required fields
    if (!city || !region || !country) {
      return NextResponse.json(
        { error: 'City, region, and country are required' },
        { status: 400 }
      );
    }

    // Validate coordinates if provided
    if (latitude !== undefined && longitude !== undefined) {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return NextResponse.json(
          { error: 'Latitude and longitude must be numbers' },
          { status: 400 }
        );
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          { error: 'Invalid latitude or longitude values' },
          { status: 400 }
        );
      }
    }

    const manualLocation = {
      success: true,
      location: {
        city,
        region,
        country,
        latitude: latitude || 0,
        longitude: longitude || 0,
        timezone: body.timezone || 'UTC',
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