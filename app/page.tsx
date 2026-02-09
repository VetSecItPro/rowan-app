'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PublicHeaderLite } from '@/components/layout/PublicHeaderLite';
import { HeroSection } from '@/components/home/HeroSection';
import { MobileStickyBar } from '@/components/home/MobileStickyBar';

const PainPointsSection = dynamic(() => import('@/components/home/PainPointsSection').then(m => ({ default: m.PainPointsSection })), { ssr: false });
const FeatureGrid = dynamic(() => import('@/components/home/FeatureGrid').then(m => ({ default: m.FeatureGrid })), { ssr: false });
const ComparisonSection = dynamic(() => import('@/components/home/ComparisonSection').then(m => ({ default: m.ComparisonSection })), { ssr: false });
const PWAInstallPrompt = dynamic(() => import('@/components/ui/PWAInstallPrompt'), { ssr: false });
const Footer = dynamic(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })), { ssr: false });
const ScrollToTop = dynamic(() => import('@/components/ui/scroll-to-top').then(m => ({ default: m.ScrollToTop })), { ssr: false });

export default function HomePage() {
  const router = useRouter();

  return (
    <>
      {/* SECURITY: JSON-LD structured data uses static literals only. Never inject dynamic/user data here. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Rowan',
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web, iOS, Android',
            description:
              'Family and household management app for tasks, meals, budgets, goals, calendar, and more.',
            url: 'https://rowanapp.com',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Rowan',
              url: 'https://rowanapp.com',
            },
          }),
        }}
      />
    <div className="min-h-screen bg-black relative overflow-hidden">

      <PublicHeaderLite animated />

      <main className="relative">
        <HeroSection
          onSignupClick={() => router.push('/signup')}
          onPricingClick={() => router.push('/pricing')}
        />

        <PainPointsSection />

        <FeatureGrid />

        <ComparisonSection />

      </main>

      <ScrollToTop />

      <MobileStickyBar />

      <PWAInstallPrompt />

      <Footer />
    </div>
    </>
  );
}
