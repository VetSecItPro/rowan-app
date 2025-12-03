/**
 * Usage Tracking API Route
 * GET /api/subscriptions/usage - Get current usage stats
 * POST /api/subscriptions/usage - Check if user can perform an action and increment usage
 *
 * IMPORTANT: Server-side only - requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getTodayUsageStats,
  getUsageWithLimits,
  canPerformAction,
  incrementUsage,
} from '@/lib/services/usage-service';
import type { UsageType } from '@/lib/types';

// Validation schema for POST
const UsageActionSchema = z.object({
  usageType: z.enum([
    'tasks_created',
    'messages_sent',
    'shopping_list_updates',
    'quick_actions_used',
  ]),
  increment: z.boolean().default(true),
});

/**
 * GET handler - Get user's current usage stats
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get usage stats with limits
    const usageStats = await getUsageWithLimits(user.id);

    return NextResponse.json(usageStats, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Check if user can perform action and optionally increment usage
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UsageActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { usageType, increment } = validation.data;

    // Check if user can perform the action
    const accessCheck = await canPerformAction(user.id, usageType);

    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: accessCheck.reason,
          currentUsage: accessCheck.currentUsage,
          limit: accessCheck.limit,
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // If increment is requested, increment the usage counter
    if (increment) {
      const incrementResult = await incrementUsage(user.id, usageType);
      if (!incrementResult.success) {
        console.error('Failed to increment usage:', incrementResult.error);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      allowed: true,
      currentUsage: accessCheck.currentUsage,
      limit: accessCheck.limit,
    });
  } catch (error) {
    console.error('Error checking usage action:', error);
    return NextResponse.json(
      { error: 'Failed to check usage action' },
      { status: 500 }
    );
  }
}
