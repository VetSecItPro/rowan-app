import { createClient } from '@/lib/supabase/client';
import { projectsService } from './budgets-service';
import { remindersService } from './reminders-service';
import { calendarService } from './calendar-service';
import { subDays } from 'date-fns';
import { logger } from '@/lib/logger';

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
  linked_reminder_id?: string;
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
 * Retrieves all bills for a space, ordered by due date.
 * @param spaceId - The space ID
 * @returns Array of bill records
 * @throws Error if the database query fails
 */
export async function getBills(spaceId: string): Promise<Bill[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bills')
    .select('id, space_id, name, amount, category, payee, notes, due_date, frequency, status, auto_pay, last_paid_date, next_due_date, linked_expense_id, linked_calendar_event_id, linked_reminder_id, reminder_enabled, reminder_days_before, last_reminder_sent_at, created_by, created_at, updated_at')
    .eq('space_id', spaceId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Retrieves a single bill by its unique identifier.
 * @param billId - The bill ID
 * @returns The bill record or null if not found
 * @throws Error if the database query fails
 */
export async function getBillById(billId: string): Promise<Bill | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bills')
    .select('id, space_id, name, amount, category, payee, notes, due_date, frequency, status, auto_pay, last_paid_date, next_due_date, linked_expense_id, linked_calendar_event_id, linked_reminder_id, reminder_enabled, reminder_days_before, last_reminder_sent_at, created_by, created_at, updated_at')
    .eq('id', billId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retrieves bills filtered by their status.
 * @param spaceId - The space ID
 * @param status - Bill status filter: 'scheduled', 'paid', 'overdue', or 'cancelled'
 * @returns Array of bills matching the status
 * @throws Error if the database query fails
 */
export async function getBillsByStatus(
  spaceId: string,
  status: BillStatus
): Promise<Bill[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bills')
    .select('id, space_id, name, amount, category, payee, notes, due_date, frequency, status, auto_pay, last_paid_date, next_due_date, linked_expense_id, linked_calendar_event_id, linked_reminder_id, reminder_enabled, reminder_days_before, last_reminder_sent_at, created_by, created_at, updated_at')
    .eq('space_id', spaceId)
    .eq('status', status)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Retrieves scheduled bills due within the next 30 days.
 * Useful for bill reminders and cash flow planning.
 * @param spaceId - The space ID
 * @returns Array of upcoming bills ordered by due date
 * @throws Error if the database query fails
 */
export async function getUpcomingBills(spaceId: string): Promise<Bill[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('bills')
    .select('id, space_id, name, amount, category, payee, notes, due_date, frequency, status, auto_pay, last_paid_date, next_due_date, linked_expense_id, linked_calendar_event_id, linked_reminder_id, reminder_enabled, reminder_days_before, last_reminder_sent_at, created_by, created_at, updated_at')
    .eq('space_id', spaceId)
    .eq('status', 'scheduled')
    .gte('due_date', today)
    .lte('due_date', thirtyDaysFromNow)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Creates a new bill with automatic reminder and calendar event creation.
 * Optionally creates a linked reminder (default: 3 days before due date)
 * and a calendar event for the due date.
 * @param input - Bill creation data including name, amount, due date, and optional settings
 * @param userId - The ID of the user creating the bill
 * @returns The created bill record with linked reminder and event IDs
 * @throws Error if the bill insert fails
 */
export async function createBill(
  input: CreateBillInput,
  userId: string
): Promise<Bill> {
  const supabase = createClient();

  // Step 1: Create the bill record
  const { data: bill, error } = await supabase
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

  const updates: { linked_reminder_id?: string; linked_calendar_event_id?: string } = {};

  // Step 2: Create linked reminder if enabled
  const reminderEnabled = input.reminder_enabled !== false;
  const reminderDaysBefore = input.reminder_days_before || 3;

  if (reminderEnabled) {
    try {
      const reminderDate = subDays(new Date(input.due_date), reminderDaysBefore);
      const reminder = await remindersService.createReminder({
        space_id: input.space_id,
        title: `Pay ${input.name}`,
        description: `Bill due: $${input.amount.toFixed(2)}${input.payee ? ` to ${input.payee}` : ''}`,
        emoji: '💰',
        category: 'bills',
        reminder_time: reminderDate.toISOString(),
        priority: 'high',
        linked_bill_id: bill.id,
      });
      updates.linked_reminder_id = reminder.id;
    } catch (reminderError) {
      logger.error('Failed to create linked reminder:', reminderError, { component: 'lib-bills-service', action: 'service_call' });
      // Continue without reminder - don't fail the bill creation
    }
  }

  // Step 3: Create calendar event for the due date
  try {
    const event = await calendarService.createEvent({
      space_id: input.space_id,
      title: `${input.name} Due`,
      description: `$${input.amount.toFixed(2)}${input.payee ? ` - Pay to ${input.payee}` : ''}`,
      start_time: new Date(input.due_date).toISOString(),
      category: 'personal',
      event_type: 'bill_due',
      linked_bill_id: bill.id,
    });
    updates.linked_calendar_event_id = event.id;
  } catch (calendarError) {
    logger.error('Failed to create linked calendar event:', calendarError, { component: 'lib-bills-service', action: 'service_call' });
    // Continue without calendar event - don't fail the bill creation
  }

  // Step 4: Update bill with linked IDs
  if (updates.linked_reminder_id || updates.linked_calendar_event_id) {
    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update(updates)
      .eq('id', bill.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update bill with linked IDs:', updateError, { component: 'lib-bills-service', action: 'service_call' });
      return bill; // Return original bill if update fails
    }
    return updatedBill;
  }

  return bill;
}

/**
 * Updates an existing bill record.
 * Note: Does not automatically update linked reminders or calendar events.
 * @param billId - The bill ID to update
 * @param updates - Partial bill data to update
 * @returns The updated bill record
 * @throws Error if the update operation fails
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
 * Permanently deletes a bill record.
 * Note: Linked reminders and calendar events should be cleaned up separately.
 * @param billId - The bill ID to delete
 * @throws Error if the delete operation fails
 */
export async function deleteBill(billId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('bills').delete().eq('id', billId);

  if (error) throw error;
}

/**
 * Marks a bill as paid and handles all related updates.
 * Optionally creates an expense record for the payment.
 * Completes linked reminders and calendar events.
 * For recurring bills, automatically creates the next bill instance.
 * @param billId - The bill ID to mark as paid
 * @param createExpense - Whether to create an expense record (default: true)
 * @returns The updated bill and optional expense record
 * @throws Error if bill not found or update fails
 */
export async function markBillAsPaid(
  billId: string,
  createExpense = true
): Promise<{ bill: Bill; expense?: Record<string, unknown> }> {
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

  // Complete linked reminder if exists
  if (bill.linked_reminder_id) {
    try {
      await remindersService.updateReminder(bill.linked_reminder_id, {
        status: 'completed',
      });
    } catch (reminderError) {
      logger.error('Failed to complete linked reminder:', reminderError, { component: 'lib-bills-service', action: 'service_call' });
      // Continue - don't fail the bill payment
    }
  }

  // Complete linked calendar event if exists
  if (bill.linked_calendar_event_id) {
    try {
      await calendarService.updateEventStatus(
        bill.linked_calendar_event_id,
        'completed'
      );
    } catch (eventError) {
      logger.error('Failed to complete linked calendar event:', eventError, { component: 'lib-bills-service', action: 'service_call' });
      // Continue - don't fail the bill payment
    }
  }

  // If recurring, create next bill instance (with new linked reminder and event)
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

  return { bill: updatedBill, expense: expense as Record<string, unknown> | undefined };
}

/**
 * Calculates bill statistics for a space.
 * Includes counts by status, upcoming bills this month, and total amount due.
 * @param spaceId - The space ID
 * @returns Statistics object with bill counts and totals
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
 * Updates status to 'overdue' for scheduled bills past their due date.
 * Intended to be called periodically by a cron job.
 */
export async function markOverdueBills(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc('mark_bills_overdue');
}

/** Aggregated service for bill CRUD, payment tracking, and statistics. */
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
