'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PublicHeaderLite } from '@/components/layout/PublicHeaderLite';
import { HeroSection } from '@/components/home/HeroSection';
import { MobileStickyBar } from '@/components/home/MobileStickyBar';

// Dynamic imports for below-fold sections (reduces initial bundle)
const PainPointsSection = dynamic(() => import('@/components/home/PainPointsSection').then(m => ({ default: m.PainPointsSection })), { ssr: false });
const HowItWorksSection = dynamic(() => import('@/components/home/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })), { ssr: false });
const FeatureShowcase = dynamic(() => import('@/components/home/FeatureShowcase').then(m => ({ default: m.FeatureShowcase })), { ssr: false });
const TrustSecuritySection = dynamic(() => import('@/components/home/TrustSecuritySection').then(m => ({ default: m.TrustSecuritySection })), { ssr: false });
const PricingPreviewSection = dynamic(() => import('@/components/home/PricingPreviewSection').then(m => ({ default: m.PricingPreviewSection })), { ssr: false });
const FAQSection = dynamic(() => import('@/components/home/FAQSection').then(m => ({ default: m.FAQSection })), { ssr: false });
const FinalCTASection = dynamic(() => import('@/components/home/FinalCTASection').then(m => ({ default: m.FinalCTASection })), { ssr: false });
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

        <HowItWorksSection />

        <FeatureShowcase />

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
