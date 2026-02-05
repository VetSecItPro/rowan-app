import type { Metadata } from 'next';
import { ShoppingFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Shopping Lists - Rowan | Family Household Management',
  description:
    'Create shared shopping lists that sync in real-time. Check items off from the store and everyone sees the update instantly.',
  openGraph: {
    title: 'Shopping Lists - Rowan',
    description:
      'Create shared shopping lists that sync in real-time. Check items off from the store and everyone sees the update instantly.',
    url: 'https://rowanapp.com/features/shopping',
  },
};

export default function ShoppingFeaturePage() {
  return <ShoppingFeatureContent />;
}
