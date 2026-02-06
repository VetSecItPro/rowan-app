import type { Metadata } from 'next';
import { BudgetFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Family Budget - Rowan | Family Household Management',
  description:
    'Track household spending together. Set budgets by category, split expenses, and stay on top of bills as a family.',
  openGraph: {
    title: 'Family Budget - Rowan',
    description:
      'Track household spending together. Set budgets by category, split expenses, and stay on top of bills.',
    url: 'https://rowanapp.com/features/budget',
  },
};

export default function BudgetFeaturePage() {
  return <BudgetFeatureContent />;
}
