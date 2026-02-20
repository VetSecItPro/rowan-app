'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PublicHeaderLite } from '@/components/layout/PublicHeaderLite';
import { MobileStickyBar } from '@/components/home/MobileStickyBar';

// Loading placeholder to reserve space and prevent CLS
const SectionSkeleton = () => <div className="py-20 px-4" aria-hidden="true" />;

// PERF-001: Lazy-load HeroSection — pulls in @remotion/player (~100-200KB)
const HeroSection = dynamic(() => import('@/components/home/HeroSection').then(m => ({ default: m.HeroSection })), { ssr: false, loading: SectionSkeleton });

// Dynamic imports for below-fold sections (reduces initial bundle)
const PainPointsSection = dynamic(() => import('@/components/home/PainPointsSection').then(m => ({ default: m.PainPointsSection })), { ssr: false, loading: SectionSkeleton });
const HowItWorksSection = dynamic(() => import('@/components/home/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })), { ssr: false, loading: SectionSkeleton });
const FeatureShowcase = dynamic(() => import('@/components/home/FeatureShowcase').then(m => ({ default: m.FeatureShowcase })), { ssr: false, loading: SectionSkeleton });
const HouseholdBalanceTeaser = dynamic(() => import('@/components/home/HouseholdBalanceTeaser').then(m => ({ default: m.HouseholdBalanceTeaser })), { ssr: false, loading: SectionSkeleton });
const AICompanionTeaser = dynamic(() => import('@/components/home/AICompanionTeaser').then(m => ({ default: m.AICompanionTeaser })), { ssr: false, loading: SectionSkeleton });
const TrustSecuritySection = dynamic(() => import('@/components/home/TrustSecuritySection').then(m => ({ default: m.TrustSecuritySection })), { ssr: false, loading: SectionSkeleton });
const PricingPreviewSection = dynamic(() => import('@/components/home/PricingPreviewSection').then(m => ({ default: m.PricingPreviewSection })), { ssr: false, loading: SectionSkeleton });
const FAQSection = dynamic(() => import('@/components/home/FAQSection').then(m => ({ default: m.FAQSection })), { ssr: false, loading: SectionSkeleton });
const FinalCTASection = dynamic(() => import('@/components/home/FinalCTASection').then(m => ({ default: m.FinalCTASection })), { ssr: false, loading: SectionSkeleton });
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
        // eslint-disable-next-line react/no-danger -- static JSON-LD, no user data
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

      {/* Skip to content — visually hidden, visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black"
      >
        Skip to content
      </a>

      <PublicHeaderLite animated />

      <main id="main-content" className="relative">
        <HeroSection
          onSignupClick={() => router.push('/signup')}
          onPricingClick={() => router.push('/pricing')}
        />

        <PainPointsSection />

        <HowItWorksSection />

        <FeatureShowcase />

        <HouseholdBalanceTeaser />

        <AICompanionTeaser />

        <TrustSecuritySection />

        <PricingPreviewSection
          onSignupClick={() => router.push('/signup')}
        />

        <FAQSection />

        <FinalCTASection />
      </main>

      <ScrollToTop />

      <MobileStickyBar />

      <PWAInstallPrompt />

      <Footer />
    </div>
    </>
  );
}
