'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/40 to-cyan-50/40 dark:from-gray-900 dark:via-blue-950/20 dark:to-cyan-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                <Image
                  src="/rowan-logo.png"
                  alt="Rowan Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                  priority
                />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Rowan
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/pricing" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Pricing
              </Link>
              <a href="#features" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <ThemeToggle />
              <Link
                href="/login"
                prefetch={true}
                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content Components */}
      <main>
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
      <footer className="relative bg-gradient-to-b from-transparent to-gray-100/50 dark:to-gray-900/50 border-t border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-8 gap-4">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <span>Rowan © 2025</span>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <span className="text-sm">Veteran Owned Business</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/security" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
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
