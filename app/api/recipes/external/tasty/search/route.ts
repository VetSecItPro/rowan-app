/**
 * API Route: Search Tasty Recipes (via RapidAPI)
 * Proxies Tasty API to keep API key secure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    if (!rapidApiKey) {
      logger.error('RapidAPI key not configured', undefined, { component: 'api-route', action: 'api_request' });
      return NextResponse.json([]);
    }

    const response = await fetch(
      `https://tasty.p.rapidapi.com/recipes/list?from=0&size=10&q=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'tasty.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      logger.error('Tasty API search failed:', undefined, { component: 'api-route', action: 'api_request', details: response.statusText });
      return NextResponse.json([]);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json([]);
    }

    const recipes = data.results.map((recipe: any) => {
      // Parse and sanitize ingredients (external data could contain XSS payloads)
      const ingredients = recipe.sections?.[0]?.components?.map((comp: any) => ({
        name: sanitizePlainText(comp.ingredient?.name || comp.raw_text),
        amount: comp.measurements?.[0]?.quantity || undefined,
        unit: sanitizePlainText(comp.measurements?.[0]?.unit?.name) || undefined,
      })) || [];

      // Parse and sanitize instructions
      const instructions = recipe.instructions?.map((inst: any, idx: number) =>
        `${idx + 1}. ${sanitizePlainText(inst.display_text)}`
      ).join('\n\n') || '';

      return {
        id: `tasty-${recipe.id}`,
        source: 'tasty',
        name: sanitizePlainText(recipe.name),
        description: sanitizePlainText(recipe.description),
        image_url: sanitizeUrl(recipe.thumbnail_url || recipe.original_video_url),
        prep_time: recipe.prep_time_minutes,
        cook_time: recipe.cook_time_minutes,
        servings: recipe.num_servings,
        cuisine: sanitizePlainText(recipe.tags?.find((t: any) => t.type === 'cuisine')?.display_name),
        ingredients,
        instructions,
        source_url: recipe.canonical_id ? `https://tasty.co/recipe/${encodeURIComponent(recipe.slug || '')}` : undefined,
      };
    });

    return NextResponse.json(recipes);
  } catch (error) {
    logger.error('Tasty search API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    );
  }
}
