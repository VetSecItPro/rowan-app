'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Sparkles, ArrowRight, Users, Shield, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Footer } from '@/components/layout/Footer';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <UpgradePageContent />
    </Suspense>
  );
}

function UpgradePageContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email');
  const hasTrackedRef = useRef(false);

  async function trackUpgradePageVisit(email: string) {
    try {
      await supabase.rpc('track_upgrade_page_visit', { user_email: email });
    } catch (error) {
      logger.error('Error tracking upgrade visit:', error, { component: 'page', action: 'execution' });
      // Fail silently - don't disrupt user experience
    }
  }

  useEffect(() => {
    // Track page visit for conversion analytics
    if (!emailParam || hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;
    if (emailParam) {
      trackUpgradePageVisit(emailParam);
    }
  }, [emailParam]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <PublicHeader />
      <div className="flex-1">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-800 rounded-full">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-100">
              Upgrade Your Plan
            </span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
          Ready to Keep Your Family Organized?
        </h1>
        <p className="text-xl text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          Unlock all features and supercharge your family organization with a full account.
        </p>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-white mb-2">Family Spaces</h3>
            <p className="text-sm text-gray-400">
              Invite unlimited family members and manage multiple households
            </p>
          </div>

          <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-white mb-2">All Features</h3>
            <p className="text-sm text-gray-400">
              Tasks, calendar, meals, shopping lists, and more - all in one place
            </p>
          </div>

          <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-white mb-2">Your Data Safe</h3>
            <p className="text-sm text-gray-400">
              Keep all your tasks, events, and family data with secure access
            </p>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
            {/* Pricing Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Full Access</h2>
              <p className="text-blue-100">Everything you need for family life</p>
            </div>

            {/* Pricing Details */}
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-white mb-2">
                  Coming Soon
                </div>
                <p className="text-gray-400">
                  Pricing plans will be announced shortly
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/30 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-gray-300">Unlimited tasks and events</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/30 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-gray-300">Multiple family spaces</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/30 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-gray-300">Real-time collaboration</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/30 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-gray-300">Priority support</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/30 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-gray-300">Early access to new features</p>
                </div>
              </div>

              {/* CTA Button */}
              <Link
                href="/signup"
                className="block w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-center shadow-lg hover:shadow-xl group"
              >
                <span className="flex items-center justify-center gap-2">
                  Create Your Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>

              {/* Fine Print */}
              <p className="text-xs text-center text-gray-400 mt-6">
                Sign up now to save your spot. Billing starts when pricing is announced.
              </p>
            </div>
          </div>
        </div>

        {/* Testimonial/Trust Section */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">
            Join thousands of families already staying organized with Rowan
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-gray-900" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-gray-900" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-gray-900" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 border-2 border-gray-900" />
            </div>
            <span className="text-sm text-gray-400">
              and many more...
            </span>
          </div>
        </div>

        {/* Support Link */}
        <p className="text-center text-sm text-gray-400 mt-12">
          Questions?{' '}
          <a href="mailto:contact@steelmotionllc.com" className="text-blue-400 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
      </div>
      <Footer />
    </div>
  );
}
