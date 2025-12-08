import { createClient } from '@/lib/supabase/client';

// ==================== TYPES ====================

export type SplitType = 'equal' | 'percentage' | 'fixed' | 'income-based';
export type OwnershipType = 'shared' | 'yours' | 'theirs';
export type SplitStatus = 'pending' | 'partially-paid' | 'settled';

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  amount_paid: number;
  percentage: number | null;
  is_payer: boolean;
  status: SplitStatus;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: string;
  space_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  settlement_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  expense_ids: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnershipBalance {
  id: string;
  partnership_id: string;
  space_id: string;
  user1_id: string;
  user2_id: string;
  balance: number; // Positive = user1 owes user2, Negative = user2 owes user1
  user1_income: number | null;
  user2_income: number | null;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSettlementInput {
  space_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  settlement_date?: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  expense_ids?: string[];
  created_by: string;
}

export interface UpdateSplitExpenseInput {
  ownership?: OwnershipType;
  split_type?: SplitType;
  split_percentage_user1?: number;
  split_percentage_user2?: number;
  split_amount_user1?: number;
  split_amount_user2?: number;
  is_split?: boolean;
}

export interface BalanceSummary {
  user_id: string;
  user_email?: string;
  amount_owed: number; // What they owe
  amount_owed_to_them: number; // What is owed to them
  net_balance: number; // Negative = they owe, Positive = owed to them
}

export interface SettlementSummary {
  space_id: string;
  from_user_id: string;
  to_user_id: string;
  settlement_count: number;
  total_settled: number;
  first_settlement: string | null;
  last_settlement: string | null;
}

// ==================== EXPENSE SPLITS ====================

/**
 * Gets all splits for an expense
 */
export async function getExpenseSplits(expenseId: string): Promise<ExpenseSplit[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('expense_splits')
    .select('*')
    .eq('expense_id', expenseId);

  if (error) throw error;
  return data || [];
}

/**
 * Gets all expenses that a user owes money on
 */
export async function getUserOwedExpenses(
  userId: string,
  spaceId?: string
): Promise<(ExpenseSplit & { expense?: any })[]> {
  const supabase = createClient();

  let query = supabase
    .from('expense_splits')
    .select('*, expenses!expense_id!inner(*)')
    .eq('user_id', userId)
    .eq('is_payer', false)
    .neq('status', 'settled');

  if (spaceId) {
    query = query.eq('expenses.space_id', spaceId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    expense: item.expenses,
  }));
}

/**
 * Updates ownership and split settings for an expense
 */
export async function updateExpenseSplit(
  expenseId: string,
  updates: UpdateSplitExpenseInput
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('expenses').update(updates).eq('id', expenseId);

  if (error) throw error;

  // If is_split is true, trigger recalculation
  if (updates.is_split !== false) {
    await recalculateExpenseSplits(expenseId);
  }
}

/**
 * Manually trigger split recalculation
 */
export async function recalculateExpenseSplits(expenseId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('calculate_expense_splits', {
    p_expense_id: expenseId,
  });

  if (error) throw error;
}

/**
 * Marks a split as paid/settled
 */
export async function settleExpenseSplit(splitId: string, amount?: number): Promise<void> {
  const supabase = createClient();

  // Get current split
  const { data: split, error: fetchError } = await supabase
    .from('expense_splits')
    .select('*')
    .eq('id', splitId)
    .single();

  if (fetchError) throw fetchError;

  const amountPaid = amount || split.amount_owed;
  const totalPaid = split.amount_paid + amountPaid;

  const newStatus: SplitStatus =
    totalPaid >= split.amount_owed
      ? 'settled'
      : totalPaid > 0
      ? 'partially-paid'
      : 'pending';

  const { error } = await supabase
    .from('expense_splits')
    .update({
      amount_paid: totalPaid,
      status: newStatus,
      settled_at: newStatus === 'settled' ? new Date().toISOString() : null,
    })
    .eq('id', splitId);

  if (error) throw error;
}

// ==================== SETTLEMENTS ====================

/**
 * Creates a new settlement (payment between partners)
 */
export async function createSettlement(input: CreateSettlementInput): Promise<Settlement> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlements')
    .insert([
      {
        space_id: input.space_id,
        from_user_id: input.from_user_id,
        to_user_id: input.to_user_id,
        amount: input.amount,
        settlement_date: input.settlement_date || new Date().toISOString().split('T')[0],
        payment_method: input.payment_method || null,
        reference_number: input.reference_number || null,
        notes: input.notes || null,
        expense_ids: input.expense_ids || null,
        created_by: input.created_by,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // If expense_ids provided, mark those splits as settled
  if (input.expense_ids && input.expense_ids.length > 0) {
    await markExpenseSplitsSettled(input.expense_ids, input.from_user_id);
  }

  return data;
}

/**
 * Marks expense splits as settled after a settlement payment
 */
async function markExpenseSplitsSettled(expenseIds: string[], userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('expense_splits')
    .update({
      status: 'settled',
      settled_at: new Date().toISOString(),
    })
    .in('expense_id', expenseIds)
    .eq('user_id', userId)
    .eq('is_payer', false);

  if (error) throw error;
}

/**
 * Gets all settlements for a space
 */
export async function getSettlements(spaceId: string, limit = 50): Promise<Settlement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('space_id', spaceId)
    .order('settlement_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Gets settlements between two specific users
 */
export async function getSettlementsBetweenUsers(
  spaceId: string,
  user1Id: string,
  user2Id: string
): Promise<Settlement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('space_id', spaceId)
    .or(`from_user_id.eq.${user1Id},to_user_id.eq.${user1Id}`)
    .or(`from_user_id.eq.${user2Id},to_user_id.eq.${user2Id}`)
    .order('settlement_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Deletes a settlement
 */
export async function deleteSettlement(settlementId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('settlements').delete().eq('id', settlementId);

  if (error) throw error;
}

// ==================== PARTNERSHIP BALANCES ====================

/**
 * Gets current balance between partners in a space
 */
export async function getPartnershipBalance(spaceId: string): Promise<PartnershipBalance | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('partnership_balances')
    .select('*')
    .eq('space_id', spaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
  return data;
}

/**
 * Updates income information for income-based splitting
 */
export async function updateIncomes(
  spaceId: string,
  user1Id: string,
  user1Income: number,
  user2Id: string,
  user2Income: number
): Promise<void> {
  const supabase = createClient();

  // Get partnership_id from space
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('partnership_id')
    .eq('id', spaceId)
    .single();

  if (spaceError) throw spaceError;

  // Upsert balance record
  const { error } = await supabase.from('partnership_balances').upsert(
    {
      partnership_id: space.partnership_id,
      space_id: spaceId,
      user1_id: user1Id,
      user2_id: user2Id,
      user1_income: user1Income,
      user2_income: user2Income,
      last_calculated_at: new Date().toISOString(),
    },
    { onConflict: 'partnership_id,space_id' }
  );

  if (error) throw error;
}

/**
 * Calculates running balance from all unsettled splits
 */
export async function calculateCurrentBalance(spaceId: string): Promise<BalanceSummary[]> {
  const supabase = createClient();

  // Get all unsettled splits for this space
  const { data: splits, error } = await supabase
    .from('expense_splits')
    .select('*, expenses!expense_id!inner(space_id), users!user_id!inner(email)')
    .eq('expenses.space_id', spaceId)
    .neq('status', 'settled');

  if (error) throw error;

  // Group by user
  const balanceMap: Record<
    string,
    { email?: string; owed: number; owedToThem: number }
  > = {};

  for (const split of splits || []) {
    const userId = split.user_id;
    if (!balanceMap[userId]) {
      balanceMap[userId] = {
        email: (split as any).users?.email,
        owed: 0,
        owedToThem: 0,
      };
    }

    const amountRemaining = split.amount_owed - split.amount_paid;

    if (split.is_payer) {
      // This user paid, so money is owed TO them
      balanceMap[userId].owedToThem += amountRemaining;
    } else {
      // This user owes money
      balanceMap[userId].owed += amountRemaining;
    }
  }

  // Convert to array
  return Object.entries(balanceMap).map(([userId, data]) => ({
    user_id: userId,
    user_email: data.email,
    amount_owed: Math.round(data.owed * 100) / 100,
    amount_owed_to_them: Math.round(data.owedToThem * 100) / 100,
    net_balance: Math.round((data.owedToThem - data.owed) * 100) / 100,
  }));
}

/**
 * Gets settlement summary between users
 */
export async function getSettlementSummary(spaceId: string): Promise<SettlementSummary[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlement_summary')
    .select('*')
    .eq('space_id', spaceId);

  if (error) throw error;
  return data || [];
}

// ==================== FAIRNESS CALCULATIONS ====================

/**
 * Calculates fair split based on income ratio
 */
export function calculateIncomeBasedSplit(
  totalAmount: number,
  user1Income: number,
  user2Income: number
): { user1Amount: number; user2Amount: number; user1Percentage: number; user2Percentage: number } {
  const totalIncome = user1Income + user2Income;

  if (totalIncome === 0) {
    // Fallback to equal split if no income data
    return {
      user1Amount: totalAmount / 2,
      user2Amount: totalAmount / 2,
      user1Percentage: 50,
      user2Percentage: 50,
    };
  }

  const user1Percentage = (user1Income / totalIncome) * 100;
  const user2Percentage = (user2Income / totalIncome) * 100;

  return {
    user1Amount: Math.round(((totalAmount * user1Income) / totalIncome) * 100) / 100,
    user2Amount: Math.round(((totalAmount * user2Income) / totalIncome) * 100) / 100,
    user1Percentage: Math.round(user1Percentage * 100) / 100,
    user2Percentage: Math.round(user2Percentage * 100) / 100,
  };
}

/**
 * Suggests fair split type based on expense category
 */
export function suggestSplitType(category: string, amount: number): SplitType {
  const sharedCategories = [
    'Groceries',
    'Utilities',
    'Rent',
    'Housing',
    'Insurance',
    'Household',
  ];

  const personalCategories = [
    'Clothing',
    'Personal Care',
    'Hobbies',
    'Entertainment',
    'Gifts',
  ];

  if (sharedCategories.includes(category)) {
    // Large shared expenses should use income-based
    if (amount > 500) {
      return 'income-based';
    }
    return 'equal';
  }

  if (personalCategories.includes(category)) {
    // Personal expenses shouldn't be split by default
    return 'equal'; // Return equal but mark as non-split
  }

  return 'equal';
}

// ==================== REPORTING ====================

/**
 * Gets expense breakdown by ownership type
 */
export async function getExpensesByOwnership(
  spaceId: string,
  startDate?: string,
  endDate?: string
): Promise<{ ownership: OwnershipType; total: number; count: number }[]> {
  const supabase = createClient();

  let query = supabase.from('expenses').select('ownership, amount').eq('space_id', spaceId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error } = await query;

  if (error) throw error;

  // Group by ownership
  const stats = (data || []).reduce((acc: any, expense: any) => {
    const ownership = expense.ownership || 'shared';
    if (!acc[ownership]) {
      acc[ownership] = { ownership, total: 0, count: 0 };
    }
    acc[ownership].total += parseFloat(expense.amount);
    acc[ownership].count += 1;
    return acc;
  }, {});

  return Object.values(stats);
}

/**
 * Gets split expense statistics
 */
export async function getSplitExpenseStats(
  spaceId: string
): Promise<{
  totalSplit: number;
  splitCount: number;
  unsettledCount: number;
  unsettledAmount: number;
}> {
  const supabase = createClient();

  // Get all split expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('id, amount')
    .eq('space_id', spaceId)
    .eq('is_split', true);

  if (expensesError) throw expensesError;

  const totalSplit = (expenses || []).reduce((sum: number, e: { amount: number }) => sum + parseFloat(e.amount.toString()), 0);

  // Get unsettled splits
  const { data: splits, error: splitsError } = await supabase
    .from('expense_splits')
    .select('amount_owed, amount_paid, expenses!expense_id!inner(space_id)')
    .eq('expenses.space_id', spaceId)
    .neq('status', 'settled');

  if (splitsError) throw splitsError;

  const unsettledAmount = (splits || []).reduce(
    (sum: number, s: { amount_owed: number; amount_paid: number }) => sum + (s.amount_owed - s.amount_paid),
    0
  );

  return {
    totalSplit: Math.round(totalSplit * 100) / 100,
    splitCount: expenses?.length || 0,
    unsettledCount: splits?.length || 0,
    unsettledAmount: Math.round(unsettledAmount * 100) / 100,
  };
}

/**
 * Gets monthly settlement trends
 */
export async function getMonthlySettlementTrends(
  spaceId: string,
  months = 6
): Promise<{ month: string; total: number; count: number }[]> {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('settlements')
    .select('settlement_date, amount')
    .eq('space_id', spaceId)
    .gte('settlement_date', startDateStr)
    .order('settlement_date', { ascending: true });

  if (error) throw error;

  // Group by month
  const monthMap: Record<string, { total: number; count: number }> = {};

  for (const settlement of data || []) {
    const monthKey = settlement.settlement_date.substring(0, 7); // YYYY-MM
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { total: 0, count: 0 };
    }
    monthMap[monthKey].total += parseFloat(settlement.amount.toString());
    monthMap[monthKey].count += 1;
  }

  // Convert to array
  return Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
