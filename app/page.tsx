'use client';

import { useState } from 'react';
import { CheckSquare, Calendar, Bell, MessageCircle, ShoppingCart, UtensilsCrossed, Home, Target } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { FeatureCard } from '@/components/home/FeatureCard';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const router = useRouter();
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  const handleBetaSuccess = () => {
    // On successful beta access, redirect to signup
    router.push('/signup?beta=true');
  };

  const handleBetaModalClose = () => {
    setIsBetaModalOpen(false);
  };

  const handleLaunchModalClose = () => {
    setIsLaunchModalOpen(false);
  };

  const handleSwitchToLaunch = () => {
    setIsBetaModalOpen(false);
    setIsLaunchModalOpen(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo and Brand - Clickable */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/rowan-logo.png"
                alt="Rowan Logo"
                width={32}
                height={32}
                className="w-8 h-8 transition-transform group-hover:scale-110"
              />
              <span className="text-2xl font-semibold gradient-text">Rowan</span>
            </Link>

            {/* Theme Toggle & Pricing */}
            <div className="flex items-center gap-4">
              <a href="#pricing" className="hidden md:block inline-block py-3 px-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={160}
              height={160}
              className="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 drop-shadow-2xl"
              priority
            />
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-gray-900 dark:text-white">Rowan</h1>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-medium">
            <span className="text-gray-900 dark:text-white">Your Life, </span>
            <span className="shimmer font-bold">Organized</span>
          </h2>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg md:text-xl mb-12 max-w-2xl mx-auto px-4">
          Collaborative life management for couples and families
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setIsBetaModalOpen(true)}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all shadow-xl shadow-blue-500/50"
          >
            Access for Beta Test
          </button>
          <button
            onClick={() => setIsLaunchModalOpen(true)}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold transition-all shadow-xl shadow-green-500/50"
          >
            Get Notified on Launch
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-gradient-to-t from-purple-200 via-purple-100/50 to-white dark:from-purple-900 dark:via-purple-900/50 dark:to-black pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center mb-16">What You Can Do</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            title="Tasks & Chores"
            description="Organize daily tasks and household chores together"
            icon={CheckSquare}
            gradient="from-blue-500 to-blue-600"
            shadowColor="shadow-blue-500/50"
            href="/features/tasks"
          />

          <FeatureCard
            title="Shared Calendar"
            description="Keep everyone in sync with a shared calendar"
            icon={Calendar}
            gradient="from-purple-500 to-purple-600"
            shadowColor="shadow-purple-500/50"
            href="/features/calendar"
          />

          <FeatureCard
            title="Smart Reminders"
            description="Never miss important moments with smart reminders"
            icon={Bell}
            gradient="from-pink-500 to-pink-600"
            shadowColor="shadow-pink-500/50"
            href="/features/reminders"
          />

          <FeatureCard
            title="Built-in Messaging"
            description="Communicate seamlessly with your family"
            icon={MessageCircle}
            gradient="from-green-500 to-green-600"
            shadowColor="shadow-green-500/50"
            href="/features/messages"
          />

          <FeatureCard
            title="Shopping Lists"
            description="Collaborative shopping lists that sync in real-time"
            icon={ShoppingCart}
            gradient="from-emerald-500 to-emerald-600"
            shadowColor="shadow-emerald-500/50"
            href="/features/shopping"
          />

          <FeatureCard
            title="Meal Planning"
            description="Plan your meals for the week ahead"
            icon={UtensilsCrossed}
            gradient="from-orange-500 to-orange-600"
            shadowColor="shadow-orange-500/50"
            href="/features/meals"
          />

          <FeatureCard
            title="Budget & Expenses"
            description="Track your budget and manage household expenses"
            icon={Home}
            gradient="from-amber-500 to-amber-600"
            shadowColor="shadow-amber-500/50"
            href="/features/budget"
          />

          <FeatureCard
            title="Goals & Milestones"
            description="Track your goals and celebrate achievements"
            icon={Target}
            gradient="from-indigo-500 to-indigo-600"
            shadowColor="shadow-indigo-500/50"
            href="/features/goals"
          />
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-black border-t border-gray-300 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
            {/* Copyright */}
            <div className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Rowan © 2025
            </div>

            {/* Links - Now visible on mobile with smaller text */}
            <div className="flex items-center gap-1 sm:gap-4 text-sm sm:text-base">
              <Link href="/privacy" className="inline-block py-2 px-2 sm:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="inline-block py-2 px-2 sm:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Terms</Link>
              <Link href="/security" className="inline-block py-2 px-2 sm:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Beta Access Modal */}
      <BetaAccessModal
        isOpen={isBetaModalOpen}
        onClose={handleBetaModalClose}
        onSuccess={handleBetaSuccess}
        onSwitchToLaunch={handleSwitchToLaunch}
      />

      {/* Launch Notification Modal */}
      <LaunchNotificationModal
        isOpen={isLaunchModalOpen}
        onClose={handleLaunchModalClose}
      />
    </div>
  );
}
