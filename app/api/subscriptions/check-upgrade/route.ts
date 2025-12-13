/**
 * Upgrade Check API Route
 * POST /api/subscriptions/check-upgrade - Check if user needs upgrade for a feature
 *
 * IMPORTANT: Server-side only - requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { shouldPromptUpgrade } from '@/lib/services/feature-access-service';

// Validation schema
const UpgradeCheckSchema = z.object({
  feature: z.string().min(1, 'Feature name is required'),
});

/**
 * POST handler - Check if user should be prompted to upgrade for a specific feature
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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
    const validation = UpgradeCheckSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { feature } = validation.data;

    // Check if upgrade is needed
    const upgradeCheck = await shouldPromptUpgrade(user.id, feature);

    return NextResponse.json({
      shouldPrompt: upgradeCheck.shouldPrompt,
      currentTier: upgradeCheck.currentTier,
      requiredTier: upgradeCheck.requiredTier,
      reason: upgradeCheck.reason,
    });
  } catch (error) {
    console.error('Error checking upgrade requirement:', error);
    return NextResponse.json(
      { error: 'Failed to check upgrade requirement' },
      { status: 500 }
    );
  }
}
