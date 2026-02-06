'use client';

import { useRouter } from 'next/navigation';
import { Clock, Users, BellRing } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { RemindersDemo } from '@/components/home/feature-demos/RemindersDemo';

export function RemindersFeatureContent() {
  const router = useRouter();

  return (
    <>
      <FeaturePageLayout
        featureName="Smart Reminders"
        tagline="Smart Reminders"
        headline="Never Forget |What Matters|"
        description="Set reminders for appointments, tasks, and family commitments. Get notified at the right time, every time."
        colorScheme={{
          primary: 'pink',
          secondary: 'pink',
          gradient: 'from-pink-500 to-rose-500',
        }}
        benefits={[
          {
            icon: Clock,
            title: 'Flexible Timing',
            description:
              'Set reminders for any time — minutes, hours, or days ahead. One-time or recurring, you choose what works.',
          },
          {
            icon: Users,
            title: 'Family Reminders',
            description:
              'Remind anyone in your household. Send nudges to family members so nothing slips through the cracks.',
          },
          {
            icon: BellRing,
            title: 'Persistent',
            description:
              'Reminders that actually work. Snooze, reschedule, or dismiss — but they won\'t let you forget.',
          },
        ]}
        detailBullets={[
          'One-time or recurring',
          'Location-based reminders',
          'Remind any family member',
          'Customizable notification times',
          'Snooze and reschedule',
        ]}
        demoComponent={<RemindersDemo />}
        onSignupClick={() => router.push('/signup')}
      />
      <RelatedFeatures currentFeature="reminders" />
    </>
  );
}
