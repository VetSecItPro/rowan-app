'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PublicHeaderLite } from '@/components/layout/PublicHeaderLite';
import { HeroSection } from '@/components/home/HeroSection';
import { MobileStickyBar } from '@/components/home/MobileStickyBar';

const PainPointsSection = dynamic(() => import('@/components/home/PainPointsSection').then(m => ({ default: m.PainPointsSection })), { ssr: false });
const FeatureGrid = dynamic(() => import('@/components/home/FeatureGrid').then(m => ({ default: m.FeatureGrid })), { ssr: false });
const SocialProofSection = dynamic(() => import('@/components/home/SocialProofSection').then(m => ({ default: m.SocialProofSection })), { ssr: false });
const ComparisonSection = dynamic(() => import('@/components/home/ComparisonSection').then(m => ({ default: m.ComparisonSection })), { ssr: false });
const PricingPreviewSection = dynamic(() => import('@/components/home/PricingPreviewSection').then(m => ({ default: m.PricingPreviewSection })), { ssr: false });
const InstallSection = dynamic(() => import('@/components/home/InstallSection').then(m => ({ default: m.InstallSection })), { ssr: false });
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
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-950/20 to-cyan-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-xl sm:blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-xl sm:blur-3xl animate-pulse delay-1000" />
      </div>

      <PublicHeaderLite animated />

      <main className="relative">
        <HeroSection
          onSignupClick={() => router.push('/signup')}
          onPricingClick={() => router.push('/pricing')}
        />

        <PainPointsSection />

        <FeatureGrid />

        <SocialProofSection />

        <ComparisonSection />

        <PricingPreviewSection onSignupClick={() => router.push('/signup')} />

        <InstallSection onSignupClick={() => router.push('/signup')} />
      </main>

      <ScrollToTop />

      <MobileStickyBar />

      <Footer />
    </div>
    </>
  );
}
