'use client';

import { useRouter } from 'next/navigation';
import { BarChart3, Flame, Trophy } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { GoalsDemo } from '@/components/home/feature-demos/GoalsDemo';

export function GoalsFeatureContent() {
  const router = useRouter();

  return (
    <FeaturePageLayout
      featureName="Family Goals"
      tagline="Family Goals"
      headline="Achieve More |As a Family|"
      description="Set family goals, track progress together, and celebrate milestones. From saving for vacation to building healthy habits."
      colorScheme={{
        primary: 'indigo',
        secondary: 'purple',
        gradient: 'from-indigo-500 to-purple-500',
      }}
      benefits={[
        {
          icon: BarChart3,
          title: 'Visual Progress',
          description:
            'Watch your progress grow with visual trackers and progress bars. Seeing the finish line keeps everyone motivated.',
        },
        {
          icon: Flame,
          title: 'Streaks & Motivation',
          description:
            'Build daily check-in streaks that keep momentum going. Small consistent steps lead to big family wins.',
        },
        {
          icon: Trophy,
          title: 'Milestone Celebrations',
          description:
            'Celebrate when you hit milestones together. Recognition keeps the whole family engaged and excited.',
        },
      ]}
      detailBullets={[
        'Savings goals with progress bars',
        'Daily check-in streaks',
        'Milestone celebrations',
        'Family leaderboard',
        'Custom goal categories',
      ]}
      demoComponent={<GoalsDemo />}
      onSignupClick={() => router.push('/signup')}
      relatedFeaturesSection={<RelatedFeatures currentFeature="goals" />}
    />
  );
}
