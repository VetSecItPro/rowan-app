import { createClient } from '@/lib/supabase/client';

export const mealPlanTasksService = {
  async createTaskFromMealPlan(mealPlanId: string, spaceId: string, createdBy: string): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_meal_prep_task', {
      p_meal_plan_id: mealPlanId,
      p_space_id: spaceId,
      p_created_by: createdBy,
    });
    if (error) throw error;
    return data;
  },

  async getMealPlanTask(mealPlanId: string): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase.from('meal_plan_tasks')
      .select('*, task:task_id(*)')
      .eq('meal_plan_id', mealPlanId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async autoCompleteMealTasks(): Promise<void> {
    const supabase = createClient();
    await supabase.rpc('auto_complete_meal_tasks');
  },
};
