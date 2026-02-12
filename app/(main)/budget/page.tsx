import { serverAuth } from '@/lib/supabase/server-auth';
import BudgetOverviewClient from '@/components/budget/BudgetOverviewClient';

export const metadata = {
  title: 'Budget Overview - Rowan',
  description: 'Track your household spending and manage budgets',
};

export default async function BudgetOverviewPage() {
  const { spaceId } = await serverAuth();
  return <BudgetOverviewClient spaceId={spaceId} />;
}
