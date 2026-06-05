import BudgetOverviewClient from '@/components/budget/BudgetOverviewClient';

export const metadata = {
  title: 'Budget Overview - Rowan',
  description: 'Track your household spending and manage budgets',
};

// BudgetOverviewClient self-authenticates via useBudgetData (PR14), so this
// server page just sets metadata and renders it - no serverAuth prop threading.
export default function BudgetOverviewPage() {
  return <BudgetOverviewClient />;
}
