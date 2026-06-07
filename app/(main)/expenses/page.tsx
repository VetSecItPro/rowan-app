import { redirect } from 'next/navigation';

/**
 * `/expenses` is a legacy route. Expense management + receipts moved to the
 * `/budget` hub in the PR14 migration (`/budget/expenses`, `/budget/receipts`,
 * `/budget/bills`, `/budget/recurring`). The old standalone page had dead
 * "Add Manual Expense" / "Add Expense" buttons (no onClick) and a duplicate
 * receipt scanner — found by the June 2026 QA sweep (BUG-1).
 *
 * Redirect any stale bookmarks / direct URLs to the canonical budget hub.
 */
export default function ExpensesPage() {
  redirect('/budget');
}
