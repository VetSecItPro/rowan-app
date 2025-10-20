import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route since it uses request headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    let clientIP = forwarded?.split(',')[0] || realIP || request.ip || '';

    // Handle localhost and development - try to get real IP first
    if (!clientIP || clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.includes('localhost')) {
      console.log('[Geolocation API] Local development detected, attempting to get real IP...');

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
            console.log('[Geolocation API] Got external IP:', externalIP);
            clientIP = externalIP.trim();
          }
        }
      } catch (error) {
        console.log('[Geolocation API] Could not fetch external IP:', error);
      }

      // If we still don't have a valid IP, return Dallas as fallback
      if (!clientIP || clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.includes('localhost')) {
        console.log('[Geolocation API] Using Dallas fallback for local development');
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

    console.log('[Geolocation API] Getting location for IP:', clientIP);

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
      console.log('[Geolocation API] API error or invalid data:', data);

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

    console.log('[Geolocation API] Location detected:', `${location.city}, ${location.region}, ${location.country}`);

    return NextResponse.json(location);
  } catch (error) {
    console.error('[Geolocation API] Error:', error);

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