'use client';

import { useRouter } from 'next/navigation';
import { Smile, Battery, ListChecks } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { CheckInDemo } from '@/components/home/feature-demos/CheckInDemo';

export function DailyCheckInFeatureContent() {
  const router = useRouter();

  return (
    <>
      <FeaturePageLayout
        featureName="Daily Check-In"
        tagline="Daily Check-In"
        headline="Stay Connected to |How Everyone Feels|"
        description="A quick daily pulse for your family. Share moods, energy levels, and priorities so everyone stays in tune."
        colorScheme={{
          primary: 'yellow',
          secondary: 'amber',
          gradient: 'from-yellow-500 to-amber-500',
        }}
        benefits={[
          {
            icon: Smile,
            title: 'Mood Tracking',
            description:
              'A simple daily mood check lets your family know how everyone is feeling. Build empathy and understanding.',
          },
          {
            icon: Battery,
            title: 'Energy Awareness',
            description:
              'Know when someone is running on empty. Energy tracking helps the family support each other better.',
          },
          {
            icon: ListChecks,
            title: 'Daily Priorities',
            description:
              'Share what matters most today. When everyone knows each other\'s priorities, the household runs smoother.',
          },
        ]}
        detailBullets={[
          'Quick mood selection',
          'Energy level tracking',
          'Set daily priorities',
          'Family wellness overview',
          'Historical trends',
        ]}
        demoComponent={<CheckInDemo />}
        onSignupClick={() => router.push('/signup')}
      />
      <RelatedFeatures currentFeature="daily-checkin" />
    </>
  );
}
