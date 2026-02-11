import { createClient } from '@/lib/supabase/client';

type TaskRow = {
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  category?: string | null;
  due_date?: string | null;
  assigned_to?: string | null;
  created_at: string;
};

type ColumnKey = 'title' | 'description' | 'status' | 'priority' | 'category' | 'due_date' | 'assigned_to' | 'created_at';

const COLUMN_CONFIG: Record<ColumnKey, { header: string; getValue: (task: TaskRow) => string }> = {
  title: { header: 'Title', getValue: (task) => task.title },
  description: { header: 'Description', getValue: (task) => task.description || '' },
  status: { header: 'Status', getValue: (task) => task.status },
  priority: { header: 'Priority', getValue: (task) => task.priority },
  category: { header: 'Category', getValue: (task) => task.category || '' },
  due_date: { header: 'Due Date', getValue: (task) => task.due_date || '' },
  assigned_to: { header: 'Assigned To', getValue: (task) => task.assigned_to || '' },
  created_at: { header: 'Created At', getValue: (task) => new Date(task.created_at).toLocaleDateString() },
};

const DEFAULT_COLUMNS: ColumnKey[] = ['title', 'description', 'status', 'priority', 'category', 'due_date', 'assigned_to', 'created_at'];

export const taskExportService = {
  async exportToCSV(spaceId: string, filters?: { status?: string; category?: string; assigned_to?: string; columns?: string[] }): Promise<string> {
    const supabase = createClient();
    let query = supabase.from('tasks').select('title, description, status, priority, category, due_date, assigned_to, created_at').eq('space_id', spaceId);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

    const { data, error } = await query;
    if (error) throw error;

    // Use provided columns or default to all
    const columns = (filters?.columns?.filter((c): c is ColumnKey => c in COLUMN_CONFIG) || DEFAULT_COLUMNS);

    const headers = columns.map(col => COLUMN_CONFIG[col].header);
    const rows = data?.map((task: TaskRow) =>
      columns.map(col => COLUMN_CONFIG[col].getValue(task))
    );

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
