export interface Expense {
  id: string;
  space_id: string;
  title: string;
  amount: number;
  category?: string;
  date?: string;
  description?: string;
  notes?: string;
  payment_method?: string;
  paid_by?: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date?: string;
  paid_at?: string;
  recurring?: boolean;
  is_recurring?: boolean;
  recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  split_type?: 'equal' | 'percentage' | 'custom' | 'none';
  project_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Re-export from existing expense services for compatibility
export { type ExpenseSplit } from './expense-splitting-service';
export { type RecurringExpensePattern } from './recurring-expenses-service';