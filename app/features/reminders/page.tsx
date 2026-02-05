import type { Metadata } from 'next';
import { RemindersFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Smart Reminders - Rowan | Family Household Management',
  description:
    'Set reminders for appointments, tasks, and family commitments. Get notified at the right time, every time. One-time or recurring.',
  openGraph: {
    title: 'Smart Reminders - Rowan',
    description:
      'Set reminders for appointments, tasks, and family commitments. Get notified at the right time, every time.',
    url: 'https://rowanapp.com/features/reminders',
  },
};

export default function RemindersFeaturePage() {
  return <RemindersFeatureContent />;
}
