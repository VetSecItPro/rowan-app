export interface Expense {
  id: string;
  space_id: string;
  title: string;
  amount: number;
  category?: string;
  payment_method?: string;
  paid_by?: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

// Re-export from existing expense services for compatibility
export { type ExpenseSplit } from './expense-splitting-service';
export { type RecurringExpensePattern } from './recurring-expenses-service';