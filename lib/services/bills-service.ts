import { createClient } from '@/lib/supabase/client';
import { projectsService } from './budgets-service';

// =====================================================
// TYPES
// =====================================================

export type BillFrequency =
  | 'one-time'
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi-annual'
  | 'annual';

export type BillStatus = 'scheduled' | 'paid' | 'overdue' | 'cancelled';

export interface Bill {
  id: string;
  space_id: string;
  name: string;
  amount: number;
  category?: string;
  payee?: string;
  notes?: string;
  due_date: string;
  frequency: BillFrequency;
  status: BillStatus;
  auto_pay: boolean;
  last_paid_date?: string;
  next_due_date?: string;
  linked_expense_id?: string;
  linked_calendar_event_id?: string;
  reminder_enabled: boolean;
  reminder_days_before: number;
  last_reminder_sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBillInput {
  space_id: string;
  name: string;
  amount: number;
  category?: string;
  payee?: string;
  notes?: string;
  due_date: string;
  frequency?: BillFrequency;
  auto_pay?: boolean;
  reminder_enabled?: boolean;
  reminder_days_before?: number;
}

export interface UpdateBillInput {
  name?: string;
  amount?: number;
  category?: string;
  payee?: string;
  notes?: string;
  due_date?: string;
  frequency?: BillFrequency;
  status?: BillStatus;
  auto_pay?: boolean;
  reminder_enabled?: boolean;
  reminder_days_before?: number;
}

export interface BillStats {
  total: number;
  scheduled: number;
  paid: number;
  overdue: number;
  upcomingThisMonth: number;
  totalAmountDue: number;
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

/**
 * Get all bills for a space
 */
export async function getBills(spaceId: string): Promise<Bill[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('space_id', spaceId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single bill by ID
 */
export async function getBillById(billId: string): Promise<Bill | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('id', billId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get bills by status
 */
export async function getBillsByStatus(
  spaceId: string,
  status: BillStatus
): Promise<Bill[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('space_id', spaceId)
    .eq('status', status)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get upcoming bills (due within next 30 days)
 */
export async function getUpcomingBills(spaceId: string): Promise<Bill[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('space_id', spaceId)
    .eq('status', 'scheduled')
    .gte('due_date', today)
    .lte('due_date', thirtyDaysFromNow)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new bill
 */
export async function createBill(
  input: CreateBillInput,
  userId: string
): Promise<Bill> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bills')
    .insert([
      {
        ...input,
        created_by: userId,
        frequency: input.frequency || 'monthly',
        auto_pay: input.auto_pay || false,
        reminder_enabled: input.reminder_enabled !== false,
        reminder_days_before: input.reminder_days_before || 3,
        status: 'scheduled',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a bill
 */
export async function updateBill(
  billId: string,
  updates: UpdateBillInput
): Promise<Bill> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', billId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a bill
 */
export async function deleteBill(billId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('bills').delete().eq('id', billId);

  if (error) throw error;
}

/**
 * Mark bill as paid and optionally create expense record
 */
export async function markBillAsPaid(
  billId: string,
  createExpense = true
): Promise<{ bill: Bill; expense?: any }> {
  const supabase = createClient();

  // Get the bill
  const bill = await getBillById(billId);
  if (!bill) throw new Error('Bill not found');

  // Update bill status
  const { data: updatedBill, error: billError } = await supabase
    .from('bills')
    .update({
      status: 'paid',
      last_paid_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', billId)
    .select()
    .single();

  if (billError) throw billError;

  let expense;

  // Create expense record if requested
  if (createExpense) {
    expense = await projectsService.createExpense({
      space_id: bill.space_id,
      title: `${bill.name} - Bill Payment`,
      amount: bill.amount,
      category: bill.category,
      status: 'paid',
      paid_at: new Date().toISOString(),
      date: new Date().toISOString(),
    });

    // Link expense to bill
    await supabase
      .from('bills')
      .update({ linked_expense_id: expense.id })
      .eq('id', billId);
  }

  // If recurring, create next bill instance
  if (bill.frequency !== 'one-time' && bill.next_due_date) {
    await createBill(
      {
        space_id: bill.space_id,
        name: bill.name,
        amount: bill.amount,
        category: bill.category,
        payee: bill.payee,
        notes: bill.notes,
        due_date: bill.next_due_date,
        frequency: bill.frequency,
        auto_pay: bill.auto_pay,
        reminder_enabled: bill.reminder_enabled,
        reminder_days_before: bill.reminder_days_before,
      },
      bill.created_by
    );
  }

  return { bill: updatedBill, expense };
}

/**
 * Get bill statistics for a space
 */
export async function getBillStats(spaceId: string): Promise<BillStats> {
  const bills = await getBills(spaceId);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const stats: BillStats = {
    total: bills.length,
    scheduled: bills.filter((b) => b.status === 'scheduled').length,
    paid: bills.filter((b) => b.status === 'paid').length,
    overdue: bills.filter((b) => b.status === 'overdue').length,
    upcomingThisMonth: bills.filter((b) => {
      const dueDate = new Date(b.due_date);
      return (
        b.status === 'scheduled' &&
        dueDate >= monthStart &&
        dueDate <= monthEnd
      );
    }).length,
    totalAmountDue: bills
      .filter((b) => b.status === 'scheduled' || b.status === 'overdue')
      .reduce((sum, b) => sum + b.amount, 0),
  };

  return stats;
}

/**
 * Mark overdue bills (should be called periodically)
 */
export async function markOverdueBills(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc('mark_bills_overdue');
}

// Export service object
export const billsService = {
  getBills,
  getBillById,
  getBillsByStatus,
  getUpcomingBills,
  createBill,
  updateBill,
  deleteBill,
  markBillAsPaid,
  getBillStats,
  markOverdueBills,
};
