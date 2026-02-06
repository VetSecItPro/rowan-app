import type { Metadata } from 'next';
import { MealsFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Meal Planning - Rowan | Family Household Management',
  description:
    "Plan your family's meals for the week and auto-generate shopping lists. Save time, reduce waste, eat better together.",
  openGraph: {
    title: 'Meal Planning - Rowan',
    description:
      "Plan your family's meals for the week and auto-generate shopping lists. Save time, reduce waste, eat better.",
    url: 'https://rowanapp.com/features/meals',
  },
};

export default function MealsFeaturePage() {
  return <MealsFeatureContent />;
}
