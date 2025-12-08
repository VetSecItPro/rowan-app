import { createClient } from '@/lib/supabase/client';

export const taskExportService = {
  async exportToCSV(spaceId: string, filters?: any): Promise<string> {
    const supabase = createClient();
    let query = supabase.from('tasks').select('*').eq('space_id', spaceId);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

    const { data, error } = await query;
    if (error) throw error;

    const headers = ['Title', 'Description', 'Status', 'Priority', 'Category', 'Due Date', 'Assigned To', 'Created At'];
    const rows = data?.map((task: { title: string; description?: string | null; status: string; priority: string; category?: string | null; due_date?: string | null; assigned_to?: string | null; created_at: string }) => [
      task.title,
      task.description || '',
      task.status,
      task.priority,
      task.category || '',
      task.due_date || '',
      task.assigned_to || '',
      new Date(task.created_at).toLocaleDateString(),
    ]);

    let csv = headers.join(',') + '\n';
    rows?.forEach((row: string[]) => {
      csv += row.map((cell: string) => `"${cell}"`).join(',') + '\n';
    });

    return csv;
  },

  async downloadCSV(csv: string, filename: string = 'tasks.csv'): Promise<void> {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
