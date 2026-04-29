import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recipes/external/status
 *
 * Returns configuration status for each external recipe API. Useful for:
 * - Showing "configure more APIs for variety" hints in the discovery UI
 * - Operations checks (which APIs are live in this environment)
 * - Debugging "no recipe results" complaints
 *
 * Never returns keys — only `configured: boolean` per source.
 */

interface ApiStatus {
  source: 'themealdb' | 'spoonacular' | 'edamam' | 'tasty' | 'apininjas';
  configured: boolean;
  required_env: string[];
  notes: string;
}

const STATUSES = (): ApiStatus[] => [
  {
    source: 'themealdb',
    configured: true, // No key required — public API
    required_env: [],
    notes: 'Public API, always available.',
  },
  {
    source: 'spoonacular',
    configured: !!process.env.SPOONACULAR_API_KEY,
    required_env: ['SPOONACULAR_API_KEY'],
    notes: 'Free tier 150 req/day.',
  },
  {
    source: 'edamam',
    configured: !!process.env.EDAMAM_APP_ID && !!process.env.EDAMAM_APP_KEY,
    required_env: ['EDAMAM_APP_ID', 'EDAMAM_APP_KEY'],
    notes: 'Both APP_ID and APP_KEY required. Free tier 10 req/min.',
  },
  {
    source: 'tasty',
    configured: !!process.env.RAPIDAPI_KEY,
    required_env: ['RAPIDAPI_KEY'],
    notes: 'Via RapidAPI marketplace.',
  },
  {
    source: 'apininjas',
    configured: !!process.env.API_NINJAS_KEY,
    required_env: ['API_NINJAS_KEY'],
    notes: 'Free tier 50K req/month.',
  },
];

export async function GET(request: NextRequest) {
  // Rate limit (light — no expensive op)
  const ip = extractIP(request.headers);
  const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
  if (!rateLimitSuccess) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Auth required — this is internal status, not a public endpoint
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const statuses = STATUSES();
  const configured_count = statuses.filter((s) => s.configured).length;

  return NextResponse.json({
    apis: statuses,
    summary: {
      total: statuses.length,
      configured: configured_count,
      missing: statuses.length - configured_count,
    },
  });
}
