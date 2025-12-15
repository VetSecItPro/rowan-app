import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

// Force dynamic rendering for this route since it uses request headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    let clientIP = forwarded?.split(',')[0] || realIP || '';

    // Handle localhost and development - try to get real IP first
    if (!clientIP || clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.includes('localhost')) {
      logger.debug('Local development detected, attempting to get real IP', { component: 'geolocation' });

      try {
        // Try to get the external IP address even in development
        const externalIPResponse = await fetch('https://ipapi.co/ip/', {
          headers: {
            'User-Agent': 'Rowan-App/1.0',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (externalIPResponse.ok) {
          const externalIP = await externalIPResponse.text();
          if (externalIP && externalIP.trim() !== clientIP) {
            logger.debug('Got external IP', { component: 'geolocation' });
            clientIP = externalIP.trim();
          }
        }
      } catch {
        logger.debug('Could not fetch external IP', { component: 'geolocation' });
      }

      // If we still don't have a valid IP, return Dallas as fallback
      if (!clientIP || clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.includes('localhost')) {
        logger.debug('Using fallback location for local development', { component: 'geolocation' });
        return NextResponse.json({
          city: 'Dallas',
          region: 'Texas',
          country: 'United States',
          country_code: 'US',
          latitude: 32.7767,
          longitude: -96.7970,
          timezone: 'America/Chicago',
          postal: '75201',
          ip: 'localhost',
          fallback: true,
          development: true,
        });
      }
    }

    logger.debug('Getting location', { component: 'geolocation' });

    // Call ipapi.co for geolocation
    const response = await fetch(`https://ipapi.co/${clientIP}/json/`, {
      headers: {
        'User-Agent': 'Rowan-App/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`IP Geolocation API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response
    if (data.error || !data.latitude || !data.longitude) {
      logger.warn('Geolocation API returned invalid data', { component: 'geolocation', action: 'api_error' });

      // Return Dallas, Texas as fallback since user mentioned they're there
      return NextResponse.json({
        city: 'Dallas',
        region: 'Texas',
        country: 'United States',
        country_code: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        timezone: 'America/Chicago',
        postal: '75201',
        ip: clientIP,
        fallback: true,
      });
    }

    const location = {
      city: data.city || 'Unknown',
      region: data.region || data.region_code || '',
      country: data.country_name || data.country || 'Unknown',
      country_code: data.country_code || '',
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone || '',
      postal: data.postal || '',
      ip: clientIP,
      fallback: false,
    };

    logger.debug('Location detected', { component: 'geolocation', city: location.city, region: location.region });

    return NextResponse.json(location);
  } catch (error) {
    logger.error('Geolocation API error', error, { component: 'geolocation' });

    // Return Dallas, Texas as fallback
    return NextResponse.json({
      city: 'Dallas',
      region: 'Texas',
      country: 'United States',
      country_code: 'US',
      latitude: 32.7767,
      longitude: -96.7970,
      timezone: 'America/Chicago',
      postal: '75201',
      ip: 'unknown',
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}