import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ccpaService } from '@/lib/services/ccpa-service';
import { z } from 'zod';

/**
 * CCPA Opt-Out API Endpoint
 *
 * Handles California Consumer Privacy Act (CCPA) "Do Not Sell My Personal Information" requests
 * Implements CCPA Section 1798.135 - Right to Opt-Out of Sale of Personal Information
 */

const OptOutRequestSchema = z.object({
  optedOut: z.boolean(),
  californiaResident: z.boolean().optional(),
  verificationMethod: z.enum(['geolocation', 'user_declaration', 'admin']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current opt-out status
    const result = await ccpaService.getOptOutStatus(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error getting CCPA opt-out status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = OptOutRequestSchema.parse(body);

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if user is likely a California resident based on IP
    let californiaResident = validatedData.californiaResident;
    if (californiaResident === undefined) {
      californiaResident = await ccpaService.checkCaliforniaResident(ipAddress);
    }

    // Set opt-out status
    const result = await ccpaService.setOptOutStatus(user.id, validatedData.optedOut, {
      ipAddress,
      userAgent,
      californiaResident,
      verificationMethod: validatedData.verificationMethod || 'user_declaration',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: validatedData.optedOut
        ? 'Successfully opted out of personal information sale'
        : 'Successfully opted in to personal information sale',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating CCPA opt-out status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}