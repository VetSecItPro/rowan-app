import type { Metadata } from 'next';
import { DailyCheckInFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Daily Check-In - Rowan | Family Household Management',
  description:
    'A quick daily pulse for your family. Share moods, energy levels, and priorities so everyone stays in tune.',
  openGraph: {
    title: 'Daily Check-In - Rowan',
    description:
      'A quick daily pulse for your family. Share moods, energy levels, and priorities so everyone stays in tune.',
    url: 'https://rowanapp.com/features/daily-check-in',
  },
};

export default function DailyCheckInFeaturePage() {
  return <DailyCheckInFeatureContent />;
}
