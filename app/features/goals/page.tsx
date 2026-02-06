import type { Metadata } from 'next';
import { GoalsFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Family Goals - Rowan | Family Household Management',
  description:
    'Set family goals, track progress together, and celebrate milestones. From saving for vacation to building healthy habits.',
  openGraph: {
    title: 'Family Goals - Rowan',
    description:
      'Set family goals, track progress together, and celebrate milestones. From saving for vacation to building healthy habits.',
    url: 'https://rowanapp.com/features/goals',
  },
};

export default function GoalsFeaturePage() {
  return <GoalsFeatureContent />;
}
