import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/**
 * POST /api/launch/notify
 * Collect email for launch notifications
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, email } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = name.trim().slice(0, 100); // Limit name length
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255); // Normalize email

    // Create Supabase client with service role for public access
    const supabase = await createClient();

    // Check for duplicate email
    const { data: existingSubscription, error: checkError } = await supabase
      .from('launch_notifications')
      .select('id, subscribed')
      .eq('email', sanitizedEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to check existing subscription: ${checkError.message}`);
    }

    // Handle existing subscription
    if (existingSubscription) {
      if (existingSubscription.subscribed) {
        return NextResponse.json(
          {
            success: false,
            error: 'This email is already subscribed to our launch notifications.'
          },
          { status: 409 }
        );
      } else {
        // Resubscribe if previously unsubscribed
        const { error: updateError } = await supabase
          .from('launch_notifications')
          .update({
            name: sanitizedName,
            subscribed: true,
            created_at: new Date().toISOString(),
            unsubscribed_at: null,
          })
          .eq('id', existingSubscription.id);

        if (updateError) {
          throw new Error(`Failed to resubscribe: ${updateError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Successfully resubscribed to launch notifications!',
        });
      }
    }

    // Create new subscription
    const { error: insertError } = await supabase
      .from('launch_notifications')
      .insert({
        name: sanitizedName,
        email: sanitizedEmail,
        source: 'homepage',
        referrer: req.headers.get('referer') || null,
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || null,
        subscribed: true,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      throw new Error(`Failed to create subscription: ${insertError.message}`);
    }

    // Increment daily analytics for launch signups
    const today = new Date().toISOString().split('T')[0];
    const { error: analyticsError } = await supabase
      .rpc('increment_launch_signups', { target_date: today });

    if (analyticsError) {
      logger.error('Failed to update analytics:', analyticsError, { component: 'api-route', action: 'api_request' });
    }

    // Get total subscriber count for response
    const { count: totalSubscribers, error: countError } = await supabase
      .from('launch_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', true);

    if (countError) {
      logger.error('Failed to get subscriber count:', countError, { component: 'api-route', action: 'api_request' });
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to launch notifications!',
      total_subscribers: totalSubscribers || 0,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/launch/notify',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/launch/notify POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to subscribe to notifications' },
      { status: 500 }
    );
  }
}