'use client';

import { useRouter } from 'next/navigation';
import { Users, RefreshCw, DollarSign } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { ShoppingDemo } from '@/components/home/feature-demos/ShoppingDemo';

export function ShoppingFeatureContent() {
  const router = useRouter();

  return (
    <FeaturePageLayout
      featureName="Shopping Lists"
      tagline="Shopping Lists"
      headline="Smarter Shopping, |Together|"
      description="Create shared shopping lists that sync in real-time. Check items off from the store and everyone sees the update instantly."
      colorScheme={{
        primary: 'emerald',
        secondary: 'emerald',
        gradient: 'from-emerald-500 to-teal-500',
      }}
      benefits={[
        {
          icon: Users,
          title: 'Shared Lists',
          description:
            'Everyone can add items and see updates. No more duplicate purchases or forgotten essentials.',
        },
        {
          icon: RefreshCw,
          title: 'Real-Time Sync',
          description:
            'Check items off at the store and your family sees the update instantly. No more texting "did you get the milk?"',
        },
        {
          icon: DollarSign,
          title: 'Cost Tracking',
          description:
            'Track estimated costs as you add items so you can budget your grocery trips and avoid surprises at checkout.',
        },
      ]}
      detailBullets={[
        'Multiple lists (grocery, hardware, etc.)',
        'Assign items to shoppers',
        'Check off in real-time',
        'Track estimated costs',
        'Template lists for recurring trips',
      ]}
      demoComponent={<ShoppingDemo />}
      onSignupClick={() => router.push('/signup')}
      relatedFeaturesSection={<RelatedFeatures currentFeature="shopping" />}
    />
  );
}
