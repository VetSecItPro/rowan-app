'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';
import { HeroSection } from '@/components/home/HeroSection';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { PainPointsSection } from '@/components/home/PainPointsSection';
import { ComparisonSection } from '@/components/home/ComparisonSection';
import { InstallSection } from '@/components/home/InstallSection';
import { ScrollToTop } from '@/components/ui/scroll-to-top';

export default function HomePage() {
  const router = useRouter();
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  const handleBetaSuccess = (inviteCode?: string, email?: string, firstName?: string, lastName?: string) => {
    if (inviteCode) {
      const params = new URLSearchParams();
      params.set('beta_code', inviteCode);
      if (email) {
        params.set('email', email);
      }
      if (firstName) {
        params.set('first_name', firstName);
      }
      if (lastName) {
        params.set('last_name', lastName);
      }
      router.push(`/signup?${params.toString()}`);
    } else {
      router.push('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-950/20 to-cyan-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <Header variant="landing" />

      {/* Main Content Components */}
      <main className="relative">
        <HeroSection
          onBetaClick={() => setIsBetaModalOpen(true)}
          onLaunchClick={() => setIsLaunchModalOpen(true)}
        />

        <PainPointsSection />

        <FeatureGrid />

        <ComparisonSection />

        <InstallSection />
      </main>

      {/* Scroll to top button */}
      <ScrollToTop />

      {/* Footer */}
      <footer className="relative bg-gradient-to-b from-transparent to-gray-900/50 border-t border-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-8 gap-4">
            <div className="flex items-center gap-3 text-gray-400">
              <span>Rowan © 2025</span>
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

      {/* Modals */}
      <BetaAccessModal
        isOpen={isBetaModalOpen}
        onClose={() => setIsBetaModalOpen(false)}
        onSuccess={handleBetaSuccess}
        onSwitchToLaunch={() => {
          setIsBetaModalOpen(false);
          setIsLaunchModalOpen(true);
        }}
      />
      <LaunchNotificationModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
      />
    </div>
  );
}
