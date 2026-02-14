import { NextRequest, NextResponse } from 'next/server';
import { geographicDetectionService } from '@/lib/services/geographic-detection-service';
import { createClient } from '@/lib/supabase/server';
import { ccpaService } from '@/lib/services/ccpa-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/**
 * Geographic Detection API Endpoint
 *
 * Detects user's geographic location for CCPA compliance.
 * Automatically updates CCPA status for California residents.
 */

/** Detects the user's geographic location from their IP address */
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
          error: 'Unable to determine IP address',
          showCCPANotice: true // Show notice if we can't determine location
        },
        { status: 400 }
      );
    }

    // Detect geographic location
    const detection = await geographicDetectionService.detectLocation(clientIP);

    if (!detection.success) {
      return NextResponse.json(
        {
          error: detection.error,
          showCCPANotice: true // Show notice if detection fails
        },
        { status: 500 }
      );
    }

    const locationData = detection.data!;
    const shouldShowCCPA = geographicDetectionService.shouldShowCCPANotice(locationData);

    // If user is authenticated, update their CCPA status if they're a CA resident
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!authError && user && locationData.isCaliforniaResident) {
        // Get current CCPA status
        const currentStatus = await ccpaService.getOptOutStatus(user.id);

        if (currentStatus.success && currentStatus.data && (currentStatus.data as { california_resident?: boolean | null }).california_resident === null) {
          // Auto-update their CA resident status if not set
          await ccpaService.setOptOutStatus(user.id, (currentStatus.data as { opted_out?: boolean }).opted_out || false, {
            ipAddress: clientIP,
            userAgent: request.headers.get('user-agent') || 'unknown',
            californiaResident: true,
            verificationMethod: 'geolocation'
          });

          // Log the geographic verification
          await ccpaService.logCCPAAction(user.id, 'california_resident_verified', {
            detection_method: 'ip_geolocation',
            ip_address: clientIP,
            location_data: {
              city: locationData.city,
              state: locationData.state,
              country: locationData.country
            },
            confidence: detection.confidence,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (authError) {
      // Don't fail the request if auth check fails - just continue
      logger.info('Auth check failed during geographic detection:', { component: 'api-route', data: authError });
    }

    return NextResponse.json({
      success: true,
      data: {
        location: locationData,
        showCCPANotice: shouldShowCCPA,
        confidence: detection.confidence,
        detectedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in geographic detection API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      {
        error: 'Internal server error',
        showCCPANotice: true // Show notice on any error for compliance
      },
      { status: 500 }
    );
  }
}

/** Manually sets a user's preferred geographic location */
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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { declaredState, declaredResident } = body;

    if (typeof declaredResident !== 'boolean') {
      return NextResponse.json(
        { error: 'declaredResident must be a boolean' },
        { status: 400 }
      );
    }

    // Get client IP for logging
    const clientIP = geographicDetectionService.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update CCPA status with user declaration
    const result = await ccpaService.setOptOutStatus(user.id, false, {
      ipAddress: clientIP,
      userAgent,
      californiaResident: declaredResident,
      verificationMethod: 'user_declaration'
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Log the user declaration
    await ccpaService.logCCPAAction(user.id, 'california_resident_verified', {
      detection_method: 'user_declaration',
      declared_state: declaredState,
      declared_resident: declaredResident,
      ip_address: clientIP,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `California residency status updated: ${declaredResident ? 'CA resident' : 'Non-CA resident'}`
    });
  } catch (error) {
    logger.error('Error updating geographic status:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}