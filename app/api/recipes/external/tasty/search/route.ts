/**
 * API Route: Search Tasty Recipes (via RapidAPI)
 * Proxies Tasty API to keep API key secure
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    if (!rapidApiKey) {
      console.error('RapidAPI key not configured');
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
      console.error('Tasty API search failed:', response.statusText);
      return NextResponse.json([]);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json([]);
    }

    const recipes = data.results.map((recipe: any) => {
      // Parse ingredients
      const ingredients = recipe.sections?.[0]?.components?.map((comp: any) => ({
        name: comp.ingredient?.name || comp.raw_text,
        amount: comp.measurements?.[0]?.quantity || undefined,
        unit: comp.measurements?.[0]?.unit?.name || undefined,
      })) || [];

      // Parse instructions
      const instructions = recipe.instructions?.map((inst: any, idx: number) =>
        `${idx + 1}. ${inst.display_text}`
      ).join('\n\n') || '';

      return {
        id: `tasty-${recipe.id}`,
        source: 'tasty',
        name: recipe.name,
        description: recipe.description,
        image_url: recipe.thumbnail_url || recipe.original_video_url,
        prep_time: recipe.prep_time_minutes,
        cook_time: recipe.cook_time_minutes,
        servings: recipe.num_servings,
        cuisine: recipe.tags?.find((t: any) => t.type === 'cuisine')?.display_name,
        ingredients,
        instructions,
        source_url: recipe.canonical_id ? `https://tasty.co/recipe/${recipe.slug}` : undefined,
      };
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Tasty search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    );
  }
}
