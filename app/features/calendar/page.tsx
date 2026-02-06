import type { Metadata } from 'next';
import { CalendarFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Family Calendar - Rowan | Family Household Management',
  description:
    "See everyone's schedule in one place. No more double-bookings, forgotten practices, or surprise conflicts. Color-coded by family member.",
  openGraph: {
    title: 'Family Calendar - Rowan',
    description:
      "See everyone's schedule in one place. No more double-bookings, forgotten practices, or surprise conflicts.",
    url: 'https://rowanapp.com/features/calendar',
  },
};

export default function CalendarFeaturePage() {
  return <CalendarFeatureContent />;
}
