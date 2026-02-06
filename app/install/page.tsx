import type { Metadata } from 'next';
import InstallPageClient from './install-page-client';

export const metadata: Metadata = {
  title: 'Install Rowan - Rowan | Family Household Management',
  description:
    'Install Rowan on your device for the best experience. Works offline, launches instantly, no app store required.',
  openGraph: {
    title: 'Install Rowan',
    description:
      'Install Rowan on your device for the best experience. Works offline, launches instantly, no app store required.',
    url: 'https://rowanapp.com/install',
  },
};

export default function InstallPage() {
  return <InstallPageClient />;
}
