/**
 * API Route: Search External Recipes
 * Proxies TheMealDB API to avoid CSP issues
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await response.json();

    if (!data.meals) {
      return NextResponse.json([]);
    }

    const recipes = data.meals.map((meal: any) => {
      // Parse ingredients from TheMealDB format
      const ingredients: Array<{ name: string; amount?: string; unit?: string }> = [];
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];

        if (ingredient && ingredient.trim()) {
          ingredients.push({
            name: ingredient.trim(),
            amount: measure?.trim() || undefined,
          });
        }
      }

      return {
        id: `themealdb-${meal.idMeal}`,
        source: 'themealdb',
        name: meal.strMeal,
        description: `${meal.strCategory} - ${meal.strArea} cuisine`,
        image_url: meal.strMealThumb,
        cuisine: meal.strArea,
        ingredients,
        instructions: meal.strInstructions,
        source_url: meal.strSource || meal.strYoutube,
      };
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Search recipes API error:', error);
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    );
  }
}
