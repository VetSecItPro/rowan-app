'use client';

import { useRouter } from 'next/navigation';
import { Shield, Pin, SmilePlus } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { MessagesDemo } from '@/components/home/feature-demos/MessagesDemo';

export function MessagesFeatureContent() {
  const router = useRouter();

  return (
    <>
      <FeaturePageLayout
        featureName="Family Messaging"
        tagline="Family Messaging"
        headline="Your Family's |Private Space|"
        description="A dedicated chat for your household. No social media noise, no group text chaos. Just your family, staying connected."
        colorScheme={{
          primary: 'green',
          secondary: 'emerald',
          gradient: 'from-green-500 to-emerald-500',
        }}
        benefits={[
          {
            icon: Shield,
            title: 'Private & Secure',
            description:
              'A private space just for your family. No ads, no algorithms, no strangers — just the people who matter.',
          },
          {
            icon: Pin,
            title: 'Pin Important Info',
            description:
              'Pin addresses, schedules, or important notes so your family can find them instantly without scrolling.',
          },
          {
            icon: SmilePlus,
            title: 'React & Reply',
            description:
              'Quick emoji reactions and threaded replies keep conversations organized and fun.',
          },
        ]}
        detailBullets={[
          'Real-time messaging',
          'Pin important messages',
          'Emoji reactions',
          'No ads or distractions',
          'Works offline',
        ]}
        demoComponent={<MessagesDemo />}
        onSignupClick={() => router.push('/signup')}
      />
      <RelatedFeatures currentFeature="messages" />
    </>
  );
}
