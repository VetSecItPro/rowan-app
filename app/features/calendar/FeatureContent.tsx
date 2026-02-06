'use client';

import { useRouter } from 'next/navigation';
import { Eye, Palette, AlertTriangle } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { CalendarDemo } from '@/components/home/feature-demos/CalendarDemo';

export function CalendarFeatureContent() {
  const router = useRouter();

  return (
    <>
      <FeaturePageLayout
        featureName="Family Calendar"
        tagline="Family Calendar"
        headline="One Calendar for Your |Whole Family|"
        description="See everyone's schedule in one place. No more double-bookings, forgotten practices, or surprise conflicts."
        colorScheme={{
          primary: 'purple',
          secondary: 'indigo',
          gradient: 'from-purple-500 to-indigo-500',
        }}
        benefits={[
          {
            icon: Eye,
            title: 'Unified View',
            description:
              'See every family member\'s events at a glance. One calendar that keeps the whole household coordinated.',
          },
          {
            icon: Palette,
            title: 'Color-Coded',
            description:
              'Each family member gets their own color, making it easy to see who has what and when at a quick glance.',
          },
          {
            icon: AlertTriangle,
            title: 'Smart Scheduling',
            description:
              'Catch conflicts before they happen. Get alerted when events overlap so you can plan around them.',
          },
        ]}
        detailBullets={[
          'Month, week, and day views',
          'Color-coded by family member',
          'Event details with location and notes',
          'Recurring events',
          'Calendar sync',
        ]}
        demoComponent={<CalendarDemo />}
        onSignupClick={() => router.push('/signup')}
      />
      <RelatedFeatures currentFeature="calendar" />
    </>
  );
}
