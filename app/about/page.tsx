import type { Metadata } from 'next';
import AboutPageClient from './AboutPageClient';

export const metadata: Metadata = {
  title: 'About - Rowan',
  description: 'Built for families, by a family. Learn how Rowan helps households share the mental load fairly.',
  openGraph: {
    title: 'About - Rowan',
    description: 'Built for families, by a family. Rowan gives families a shared brain — so one person doesn\'t have to remember everything.',
    type: 'website',
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
