/**
 * API Route: Get Random Recipes
 * Proxies TheMealDB API to avoid CSP issues
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '12', 10);

    const recipes: any[] = [];

    // TheMealDB random endpoint returns 1 recipe at a time
    const promises = Array(count)
      .fill(null)
      .map(() =>
        fetch('https://www.themealdb.com/api/json/v1/1/random.php')
          .then((res) => res.json())
      );

    const results = await Promise.all(promises);

    for (const data of results) {
      if (data.meals && data.meals[0]) {
        const meal = data.meals[0];

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

        recipes.push({
          id: `themealdb-${meal.idMeal}`,
          source: 'themealdb',
          name: meal.strMeal,
          description: `${meal.strCategory} - ${meal.strArea} cuisine`,
          image_url: meal.strMealThumb,
          cuisine: meal.strArea,
          ingredients,
          instructions: meal.strInstructions,
          source_url: meal.strSource || meal.strYoutube,
        });
      }
    }

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Random recipes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch random recipes' },
      { status: 500 }
    );
  }
}
