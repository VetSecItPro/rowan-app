'use client';

import { useRouter } from 'next/navigation';
import { PieChart, Bell, Eye } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { BudgetDemo } from '@/components/home/feature-demos/BudgetDemo';

export function BudgetFeatureContent() {
  const router = useRouter();

  return (
    <FeaturePageLayout
      featureName="Family Budget"
      tagline="Family Budget"
      headline="See Where Your |Money Goes|"
      description="Track household spending together. Set budgets by category, split expenses, and stay on top of bills."
      colorScheme={{
        primary: 'amber',
        secondary: 'yellow',
        gradient: 'from-amber-500 to-yellow-500',
      }}
      benefits={[
        {
          icon: PieChart,
          title: 'Category Tracking',
          description:
            'See exactly where your money goes with clear category breakdowns. Groceries, utilities, subscriptions — all organized.',
        },
        {
          icon: Bell,
          title: 'Bill Reminders',
          description:
            'Never miss a payment. Get reminded before bills are due so late fees become a thing of the past.',
        },
        {
          icon: Eye,
          title: 'Family Visibility',
          description:
            'Everyone can see the household budget. Shared awareness leads to smarter spending decisions together.',
        },
      ]}
      detailBullets={[
        'Track expenses by category',
        'Set monthly budgets',
        'Bill due date reminders',
        'Recurring expense tracking',
        'Family spending overview',
      ]}
      demoComponent={<BudgetDemo />}
      onSignupClick={() => router.push('/signup')}
      relatedFeaturesSection={<RelatedFeatures currentFeature="budget" />}
    />
  );
}
