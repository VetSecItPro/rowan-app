/**
 * API Route: Search Recipes by Cuisine
 * Proxies TheMealDB API to avoid CSP issues
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cuisine = searchParams.get('cuisine');

    if (!cuisine) {
      return NextResponse.json([]);
    }

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(cuisine)}`
    );

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await response.json();

    if (!data.meals) {
      return NextResponse.json([]);
    }

    // Need to fetch full details for each meal (limit to 12)
    const detailPromises = data.meals.slice(0, 12).map(async (meal: any) => {
      const detailResponse = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`
      );
      const detailData = await detailResponse.json();
      return detailData.meals?.[0];
    });

    const meals = await Promise.all(detailPromises);

    const recipes = meals.filter(Boolean).map((meal: any) => {
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
    console.error('Cuisine search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search by cuisine' },
      { status: 500 }
    );
  }
}
