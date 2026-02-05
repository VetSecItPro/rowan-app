import type { Metadata } from 'next';
import { MessagesFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Family Messaging - Rowan | Family Household Management',
  description:
    'A dedicated chat for your household. No social media noise, no group text chaos. Just your family, staying connected.',
  openGraph: {
    title: 'Family Messaging - Rowan',
    description:
      'A dedicated chat for your household. No social media noise, no group text chaos. Just your family, staying connected.',
    url: 'https://rowanapp.com/features/messages',
  },
};

export default function MessagingFeaturePage() {
  return <MessagesFeatureContent />;
}
