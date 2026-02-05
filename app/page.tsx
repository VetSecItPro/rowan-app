'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { HeroSection } from '@/components/home/HeroSection';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { PainPointsSection } from '@/components/home/PainPointsSection';
import { SocialProofSection } from '@/components/home/SocialProofSection';
import { ComparisonSection } from '@/components/home/ComparisonSection';
import { PricingPreviewSection } from '@/components/home/PricingPreviewSection';
import { InstallSection } from '@/components/home/InstallSection';
import { ScrollToTop } from '@/components/ui/scroll-to-top';

export default function HomePage() {
  const router = useRouter();

  return (
    <>
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
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-950/20 to-cyan-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-xl sm:blur-3xl animate-pulse will-change-transform" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-xl sm:blur-3xl animate-pulse delay-1000 will-change-transform" />
      </div>

      {/* Header */}
      <PublicHeader animated />

      {/* Main Content Components */}
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

      {/* Scroll to top button */}
      <ScrollToTop />

      {/* Footer */}
      <footer className="relative bg-gradient-to-b from-transparent to-gray-900/50 border-t border-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-8 gap-4">
            <div className="flex items-center gap-3 text-gray-400">
              <span>Rowan © {new Date().getFullYear()}</span>
              <span className="text-gray-600">•</span>
              <span className="text-sm">Veteran Owned Business</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/security" className="text-gray-400 hover:text-white transition-colors">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
