import { supabase } from '@/lib/supabase';

export interface Chore {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  assigned_to?: string;
  status: 'pending' | 'completed' | 'skipped';
  due_date?: string;
  completed_at?: string;
  completion_percentage?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

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
  recurring?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChoreInput {
  space_id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  assigned_to?: string;
  status?: 'pending' | 'completed' | 'skipped';
  due_date?: string;
}

export interface CreateExpenseInput {
  space_id: string;
  title: string;
  amount: number;
  category?: string;
  payment_method?: string;
  paid_by?: string;
  status?: 'pending' | 'paid' | 'overdue';
  due_date?: string;
  recurring?: boolean;
}

export interface ChoreStats {
  total: number;
  completedThisWeek: number;
  myChores: number;
  partnerChores: number;
}

export interface BudgetStats {
  monthlyBudget: number;
  spentThisMonth: number;
  remaining: number;
  pendingBills: number;
}

export interface HouseholdStats {
  chores: ChoreStats;
  budget: BudgetStats;
}

export interface Budget {
  id: string;
  space_id: string;
  monthly_budget: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetInput {
  space_id: string;
  monthly_budget: number;
}

export const projectsService = {
  // Chores
  async getChores(spaceId: string): Promise<Chore[]> {
    const { data, error } = await supabase
      .from('chores')
      .select('*')
      .eq('space_id', spaceId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getChoreById(id: string): Promise<Chore | null> {
    const { data, error } = await supabase
      .from('chores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createChore(input: CreateChoreInput): Promise<Chore> {
    const { data, error } = await supabase
      .from('chores')
      .insert([{
        ...input,
        status: input.status || 'pending',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateChore(id: string, updates: Partial<CreateChoreInput>): Promise<Chore> {
    const finalUpdates: any = { ...updates };

    if (updates.status === 'completed' && !finalUpdates.completed_at) {
      finalUpdates.completed_at = new Date().toISOString();
    }

    if (updates.status && updates.status !== 'completed') {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('chores')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteChore(id: string): Promise<void> {
    const { error } = await supabase
      .from('chores')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getChoreStats(spaceId: string, currentUserId: string): Promise<ChoreStats> {
    const chores = await this.getChores(spaceId);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total: chores.length,
      completedThisWeek: chores.filter(c =>
        c.status === 'completed' &&
        c.completed_at &&
        new Date(c.completed_at) >= weekAgo
      ).length,
      myChores: chores.filter(c => c.assigned_to === currentUserId && c.status === 'pending').length,
      partnerChores: chores.filter(c => c.assigned_to !== currentUserId && c.status === 'pending').length,
    };
  },

  // Expenses
  async getExpenses(spaceId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('space_id', spaceId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getExpenseById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        ...input,
        status: input.status || 'pending',
        recurring: input.recurring || false,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateExpense(id: string, updates: Partial<CreateExpenseInput>): Promise<Expense> {
    const finalUpdates: any = { ...updates };

    if (updates.status === 'paid' && !finalUpdates.paid_at) {
      finalUpdates.paid_at = new Date().toISOString();
    }

    if (updates.status && updates.status !== 'paid') {
      finalUpdates.paid_at = null;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Budget
  async getBudget(spaceId: string): Promise<Budget | null> {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('space_id', spaceId)
        .single();

      // PGRST116 = no rows returned (not an error)
      if (error && error.code !== 'PGRST116') {
        console.error('getBudget error:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('getBudget exception:', error);
      return null;
    }
  },

  async setBudget(input: CreateBudgetInput, userId: string): Promise<Budget> {
    // Check if budget exists
    const existing = await this.getBudget(input.space_id);

    if (existing) {
      // Update existing budget
      const { data, error } = await supabase
        .from('budgets')
        .update({
          monthly_budget: input.monthly_budget,
          updated_at: new Date().toISOString(),
        })
        .eq('space_id', input.space_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new budget
      const { data, error } = await supabase
        .from('budgets')
        .insert([{
          ...input,
          created_by: userId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async getBudgetStats(spaceId: string): Promise<BudgetStats> {
    const [budget, expenses] = await Promise.all([
      this.getBudget(spaceId),
      this.getExpenses(spaceId),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthExpenses = expenses.filter(e =>
      new Date(e.created_at) >= monthStart
    );

    // Include both paid and pending expenses in spent calculation
    const spentThisMonth = thisMonthExpenses
      .filter(e => e.status === 'paid' || e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    const monthlyBudget = budget?.monthly_budget || 0;

    return {
      monthlyBudget,
      spentThisMonth,
      remaining: monthlyBudget - spentThisMonth,
      pendingBills: expenses.filter(e => e.status === 'pending').length,
    };
  },

  async getHouseholdStats(spaceId: string, currentUserId: string): Promise<HouseholdStats> {
    const [choreStats, budgetStats] = await Promise.all([
      this.getChoreStats(spaceId, currentUserId),
      this.getBudgetStats(spaceId),
    ]);

    return {
      chores: choreStats,
      budget: budgetStats,
    };
  },
};
