/**
 * API Route: Search API Ninjas Recipes
 * Proxies API Ninjas to keep API key secure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

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
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const apiKey = process.env.API_NINJAS_KEY;

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    if (!apiKey) {
      console.error('API Ninjas key not configured');
      return NextResponse.json([]);
    }

    const response = await fetch(
      `https://api.api-ninjas.com/v1/recipe?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error('API Ninjas search failed:', response.statusText);
      return NextResponse.json([]);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json([]);
    }

    const recipes = data.map((recipe: any) => {
      // Parse ingredients from comma-separated string
      const ingredients = recipe.ingredients
        ?.split('|')
        .map((ing: string) => ({
          name: ing.trim(),
        })) || [];

      return {
        id: `apininjas-${recipe.title}-${Date.now()}-${Math.random()}`,
        source: 'apininjas',
        name: recipe.title,
        servings: recipe.servings ? parseInt(recipe.servings) : undefined,
        ingredients,
        instructions: recipe.instructions,
      };
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('API Ninjas search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    );
  }
}
