'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Smartphone,
  Monitor,
  Download,
  Wifi,
  Home,
  Zap,
  ArrowLeft,
  Share2,
  MoreVertical,
} from 'lucide-react';
import { PublicHeaderLite } from '@/components/layout/PublicHeaderLite';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = 'ios' | 'android' | 'chrome' | 'edge' | 'other';

interface PlatformInfo {
  key: Platform;
  label: string;
  icon: typeof Smartphone;
  steps: string[];
}

interface BenefitInfo {
  icon: typeof Wifi;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

function detectPlatform(ua: string): Platform {
  // iOS Safari — exclude Chrome-on-iOS (CriOS) and Firefox-on-iOS (FxiOS)
  if (/iPhone|iPad/.test(ua) && !/CriOS|FxiOS/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Edg/.test(ua)) return 'edge';
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return 'chrome';
  return 'other';
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const PLATFORMS: PlatformInfo[] = [
  {
    key: 'ios',
    label: 'iPhone & iPad',
    icon: Smartphone,
    steps: [
      'Open rowanapp.com in Safari',
      'Tap the Share button (square with arrow) at the bottom',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ],
  },
  {
    key: 'android',
    label: 'Android',
    icon: Smartphone,
    steps: [
      'Open rowanapp.com in Chrome',
      'Tap the three-dot menu (top right)',
      'Tap "Install app" or "Add to home screen"',
      'Tap "Install" to confirm',
    ],
  },
  {
    key: 'chrome',
    label: 'Desktop Chrome',
    icon: Monitor,
    steps: [
      'Open rowanapp.com in Chrome',
      'Click the install icon in the address bar (monitor with arrow)',
      'Click "Install" in the popup',
    ],
  },
  {
    key: 'edge',
    label: 'Desktop Edge / Other',
    icon: Monitor,
    steps: [
      'Open rowanapp.com in Edge',
      'Click the "App available" icon in the address bar',
      'Click "Install"',
    ],
  },
];

const BENEFITS: BenefitInfo[] = [
  {
    icon: Wifi,
    title: 'Offline Support',
    description: 'Access your family data even without internet',
  },
  {
    icon: Home,
    title: 'Home Screen Access',
    description: 'Launch Rowan with a single tap',
  },
  {
    icon: Monitor,
    title: 'Standalone Window',
    description: 'Full-screen experience without browser chrome',
  },
  {
    icon: Zap,
    title: 'Faster Loading',
    description: 'App-like speed with cached resources',
  },
];

/** Map each platform key to a decorative icon for the step list */
const STEP_ICON_MAP: Record<Platform, typeof Share2> = {
  ios: Share2,
  android: MoreVertical,
  chrome: Monitor,
  edge: Monitor,
  other: Monitor,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PlatformCard({
  platform,
  highlighted,
}: {
  platform: PlatformInfo;
  highlighted: boolean;
}) {
  const Icon = platform.icon;
  const StepIcon = STEP_ICON_MAP[platform.key];

  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-all duration-200',
        highlighted
          ? 'ring-2 ring-blue-500/40 bg-blue-950/20 border-blue-500/30'
          : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg',
            highlighted ? 'bg-blue-500/15' : 'bg-gray-700/50'
          )}
        >
          <Icon
            className={cn('w-5 h-5', highlighted ? 'text-blue-400' : 'text-gray-400')}
          />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{platform.label}</h3>
          {highlighted && (
            <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">
              Your device
            </span>
          )}
        </div>
        {/* Decorative step icon */}
        <StepIcon className="ml-auto w-4 h-4 text-gray-600" />
      </div>

      {/* Steps */}
      <ol className="space-y-3">
        {platform.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <span className="text-sm text-gray-400 leading-relaxed pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BenefitCard({ benefit }: { benefit: BenefitInfo }) {
  const Icon = benefit.icon;
  return (
    <div className="flex flex-col items-center text-center rounded-xl border border-gray-700/50 bg-gray-800/30 p-6 transition-colors hover:bg-gray-800/50">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 mb-4">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <h4 className="text-sm font-semibold text-white mb-1">{benefit.title}</h4>
      <p className="text-xs text-gray-400 leading-relaxed">{benefit.description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPageClient() {
  // Detect platform via lazy initializer (avoids setState in effect)
  const [detectedPlatform] = useState<Platform>(() =>
    typeof navigator !== 'undefined' ? detectPlatform(navigator.userAgent) : 'other'
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  // Capture the beforeinstallprompt event (Chrome/Edge only)
  useEffect(() => {
    function handleBIP(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handleBIP);
    return () => window.removeEventListener('beforeinstallprompt', handleBIP);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  // Put the detected platform first, then the rest
  const sortedPlatforms = [
    ...PLATFORMS.filter((p) => p.key === detectedPlatform),
    ...PLATFORMS.filter((p) => p.key !== detectedPlatform),
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <PublicHeaderLite />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 pb-28 sm:pb-8">
        {/* Hero */}
        <section className="text-center pt-10 pb-10 sm:pt-16 sm:pb-14">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mb-6">
            <Image
              src="/rowan-logo.png"
              alt="Rowan"
              width={48}
              height={48}
              className="w-12 h-12"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Install Rowan
          </h1>
          <p className="text-base text-gray-400 max-w-md mx-auto mb-6">
            Get the full app experience on any device
          </p>

          {/* Native install button (Chrome/Edge only) */}
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4" />
              Install Now
            </button>
          )}
        </section>

        {/* Platform cards */}
        <section className="pb-12">
          <h2 className="text-lg font-semibold text-white mb-5">
            Installation Instructions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedPlatforms.map((platform) => (
              <PlatformCard
                key={platform.key}
                platform={platform}
                highlighted={platform.key === detectedPlatform}
              />
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="pb-12">
          <h2 className="text-lg font-semibold text-white mb-5">What You Get</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BENEFITS.map((benefit) => (
              <BenefitCard key={benefit.title} benefit={benefit} />
            ))}
          </div>
        </section>

        {/* Back link */}
        <div className="pt-2 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
