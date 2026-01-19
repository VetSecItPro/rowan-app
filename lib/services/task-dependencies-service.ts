import { createClient } from '@/lib/supabase/client';

type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'blocks' | 'relates_to';
  created_at?: string;
  dependent_task?: Record<string, unknown>;
  depends_on_task?: Record<string, unknown>;
};

export const taskDependenciesService = {
  async addDependency(taskId: string, dependsOnTaskId: string, userId: string, type: 'blocks' | 'relates_to' = 'blocks'): Promise<TaskDependency> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_dependencies').insert({
      task_id: taskId, depends_on_task_id: dependsOnTaskId, dependency_type: type, created_by: userId
    }).select().single();
    if (error) throw error;
    return data;
  },

  async getDependencies(taskId: string): Promise<TaskDependency[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_dependencies').select('*, depends_on:depends_on_task_id(*)').eq('task_id', taskId);
    if (error) throw error;
    return data || [];
  },

  async getBlockedBy(taskId: string): Promise<TaskDependency[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_dependencies').select('*, task:task_id(*)').eq('depends_on_task_id', taskId);
    if (error) throw error;
    return data || [];
  },

  async removeDependency(dependencyId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('task_dependencies').delete().eq('id', dependencyId);
    if (error) throw error;
  },
};
