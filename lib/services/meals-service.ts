import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Recipe {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  ingredients: any[]; // JSONB array - can be strings or objects
  instructions?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  difficulty?: string;
  cuisine_type?: string;
  source_url?: string;
  image_url?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  space_id: string;
  recipe_id?: string;
  recipe?: Recipe;
  name?: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  scheduled_date: string;
  notes?: string;
  assigned_to?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMealInput {
  space_id: string;
  recipe_id?: string;
  name?: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  scheduled_date: string;
  notes?: string;
}

export interface CreateRecipeInput {
  space_id: string;
  name: string;
  description?: string;
  ingredients: any[]; // JSONB array - can be strings or objects with {name, amount, unit}
  instructions?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  difficulty?: string;
  cuisine_type?: string;
  source_url?: string;
  image_url?: string;
  tags?: string[];
}

export interface MealStats {
  thisWeek: number;
  nextWeek: number;
  savedRecipes: number;
  shoppingItems: number;
}

export const mealsService = {
  async getMeals(spaceId: string): Promise<Meal[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meals')
      .select('*, recipe:recipes(*), assignee:users!meals_assigned_to_fkey(id, name, email, avatar_url)')
      .eq('space_id', spaceId)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getMealById(id: string): Promise<Meal | null> {
    const supabase = createClient();
    const { data, error} = await supabase
      .from('meals')
      .select('*, recipe:recipes(*), assignee:users!meals_assigned_to_fkey(id, name, email, avatar_url)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createMeal(input: CreateMealInput): Promise<Meal> {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('meals')
      .insert([{
        ...input,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMeal(id: string, updates: Partial<CreateMealInput>): Promise<Meal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMeal(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getRecipes(spaceId: string): Promise<Recipe[]> {
    const supabase = createClient();
    const { data, error} = await supabase
      .from('recipes')
      .select('*')
      .eq('space_id', spaceId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getRecipeById(id: string): Promise<Recipe | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createRecipe(input: CreateRecipeInput): Promise<Recipe> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recipes')
      .insert([input])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRecipe(id: string, updates: Partial<CreateRecipeInput>): Promise<Recipe> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRecipe(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getMealStats(spaceId: string): Promise<MealStats> {
    const supabase = createClient();
    const meals = await this.getMeals(spaceId);
    const recipes = await this.getRecipes(spaceId);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const thisWeek = meals.filter(m => {
      const mealDate = new Date(m.scheduled_date);
      return mealDate >= weekStart && mealDate < weekEnd;
    }).length;

    // Calculate next week (next 7 days from today)
    const nextWeekEnd = new Date(now);
    nextWeekEnd.setDate(now.getDate() + 7);

    const nextWeek = meals.filter(m => {
      const mealDate = new Date(m.scheduled_date);
      return mealDate >= now && mealDate < nextWeekEnd;
    }).length;

    // Calculate shopping items from upcoming meals
    let shoppingItems = 0;
    meals.forEach(meal => {
      if (meal.recipe && meal.recipe.ingredients) {
        shoppingItems += meal.recipe.ingredients.length;
      }
    });

    return {
      thisWeek,
      nextWeek,
      savedRecipes: recipes.length,
      shoppingItems,
    };
  },

  /**
   * Subscribe to real-time meal changes for a space
   * Enables multi-user collaboration by syncing meals instantly
   *
   * @param spaceId - The space ID to subscribe to
   * @param callback - Function called when meals change (INSERT/UPDATE/DELETE)
   * @returns RealtimeChannel - Channel object to unsubscribe later
   *
   * @example
   * ```typescript
   * const channel = mealsService.subscribeToMeals(spaceId, (payload) => {
   *   if (payload.eventType === 'INSERT') {
   *     setMeals(prev => [...prev, payload.new]);
   *   }
   * });
   * // Later: cleanup
   * supabase.removeChannel(channel);
   * ```
   */
  subscribeToMeals(
    spaceId: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Meal | null;
      old: Meal | null;
    }) => void
  ): RealtimeChannel {
    const supabase = createClient();
    return supabase
      .channel(`meals:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Meal | null,
            old: payload.old as Meal | null,
          });
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to real-time recipe changes for a space
   * Enables multi-user collaboration on recipe library
   *
   * @param spaceId - The space ID to subscribe to
   * @param callback - Function called when recipes change (INSERT/UPDATE/DELETE)
   * @returns RealtimeChannel - Channel object to unsubscribe later
   */
  subscribeToRecipes(
    spaceId: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Recipe | null;
      old: Recipe | null;
    }) => void
  ): RealtimeChannel {
    const supabase = createClient();
    return supabase
      .channel(`recipes:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Recipe | null,
            old: payload.old as Recipe | null,
          });
        }
      )
      .subscribe();
  },
};
