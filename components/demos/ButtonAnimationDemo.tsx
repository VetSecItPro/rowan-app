'use client';

import React, { useState } from 'react';
import {
  EnhancedButton,
  PrimaryButton,
  SecondaryButton,
  CTAButton,
  PremiumButton
} from '@/components/ui/EnhancedButton';
import { useButtonAnimations } from '@/hooks/useButtonAnimations';
import {
  Sparkles,
  Heart,
  Zap,
  Star,
  Check,
  ArrowRight,
  Play,
  Download,
  Send
} from 'lucide-react';

export function ButtonAnimationDemo() {
  const [successStates, setSuccessStates] = useState<Record<string, boolean>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const triggerSuccess = (buttonId: string) => {
    setSuccessStates(prev => ({ ...prev, [buttonId]: true }));
    setTimeout(() => {
      setSuccessStates(prev => ({ ...prev, [buttonId]: false }));
    }, 1000);
  };

  const triggerLoading = (buttonId: string) => {
    setLoadingStates(prev => ({ ...prev, [buttonId]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [buttonId]: false }));
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          🎯 Dynamic Button Animation System
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Apple-inspired micro-interactions with feature-aware styling
        </p>
      </div>

      {/* Animation Levels */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Zap className="w-6 h-6 text-purple-600" />
          Animation Levels
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white">Basic</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Standard transitions only
            </p>
            <EnhancedButton animationLevel="basic">
              Basic Button
            </EnhancedButton>
          </div>

          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white">Enhanced</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Hover scale + glow effects
            </p>
            <EnhancedButton animationLevel="enhanced">
              Enhanced Button
            </EnhancedButton>
          </div>

          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white">Dynamic</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              + Ripple effects + breathing
            </p>
            <EnhancedButton animationLevel="dynamic" breathing>
              Dynamic Button
            </EnhancedButton>
          </div>

          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white">Premium</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              + Magnetic attraction + gradient shift
            </p>
            <PremiumButton>
              Premium Button
            </PremiumButton>
          </div>
        </div>
      </section>

      {/* Feature-Aware Styling */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-600" />
          Feature-Aware Styling
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { feature: 'tasks', icon: Check, label: 'Tasks' },
            { feature: 'calendar', icon: Sparkles, label: 'Calendar' },
            { feature: 'messages', icon: Send, label: 'Messages' },
            { feature: 'shopping', icon: ArrowRight, label: 'Shopping' },
            { feature: 'meals', icon: Heart, label: 'Meals' },
            { feature: 'reminders', icon: Sparkles, label: 'Reminders' },
            { feature: 'goals', icon: Star, label: 'Goals' },
            { feature: 'budget', icon: Zap, label: 'Budget' },
            { feature: 'projects', icon: Play, label: 'Projects' },
            { feature: 'dashboard', icon: Sparkles, label: 'Dashboard' },
          ].map(({ feature, icon: Icon, label }) => (
            <EnhancedButton
              key={feature}
              feature={feature as any}
              animationLevel="dynamic"
              breathing
              icon={<Icon className="w-4 h-4" />}
              className="flex-col py-4 min-h-[80px]"
            >
              {label}
            </EnhancedButton>
          ))}
        </div>
      </section>

      {/* Interactive States */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Heart className="w-6 h-6 text-pink-600" />
          Interactive States
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h3 className="font-semibold">Success Celebration</h3>
            <CTAButton
              success={successStates.success}
              onClick={() => triggerSuccess('success')}
              icon={<Check className="w-4 h-4" />}
            >
              Trigger Success
            </CTAButton>
          </div>

          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h3 className="font-semibold">Loading State</h3>
            <CTAButton
              loading={loadingStates.loading}
              onClick={() => triggerLoading('loading')}
              icon={<Download className="w-4 h-4" />}
            >
              {loadingStates.loading ? 'Processing...' : 'Start Process'}
            </CTAButton>
          </div>

          <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h3 className="font-semibold">Magnetic Attraction</h3>
            <PremiumButton
              size="lg"
              icon={<Sparkles className="w-5 h-5" />}
            >
              Move Your Mouse!
            </PremiumButton>
          </div>
        </div>
      </section>

      {/* Convenience Components */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Play className="w-6 h-6 text-green-600" />
          Convenience Components
        </h2>

        <div className="flex flex-wrap gap-4">
          <PrimaryButton icon={<Check className="w-4 h-4" />}>
            Primary Button
          </PrimaryButton>

          <SecondaryButton icon={<ArrowRight className="w-4 h-4" />}>
            Secondary Button
          </SecondaryButton>

          <CTAButton
            size="lg"
            icon={<Star className="w-5 h-5" />}
            onClick={() => triggerSuccess('cta')}
            success={successStates.cta}
          >
            Call-to-Action
          </CTAButton>

          <PremiumButton
            variant="success"
            icon={<Heart className="w-4 h-4" />}
          >
            Premium Experience
          </PremiumButton>
        </div>
      </section>

      {/* Legacy Button Enhancement */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-600" />
          Legacy Button Enhancement
        </h2>

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Use hooks to enhance existing buttons without rewriting components:
          </p>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
            <pre className="text-sm text-gray-800 dark:text-gray-200">
{`// Enhance existing buttons with hooks
import { useButtonAnimations } from '@/hooks/useButtonAnimations';

function ExistingComponent() {
  const { animationProps } = useButtonAnimations({
    level: 'dynamic',
    breathing: true,
    magnetic: true
  });

  return (
    <button {...animationProps} className="your-existing-classes">
      Enhanced Legacy Button
    </button>
  );
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Performance Note */}
      <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          🚀 Performance & Accessibility
        </h3>
        <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-sm">
          <li>• All animations are GPU-accelerated using CSS transforms</li>
          <li>• Respects <code>prefers-reduced-motion</code> for accessibility</li>
          <li>• Debounced for 60fps performance</li>
          <li>• Progressive enhancement - basic buttons work without JS</li>
          <li>• Feature-aware coloring matches your design system</li>
        </ul>
      </section>
    </div>
  );
}

// Example of legacy button enhancement
export function LegacyButtonExample() {
  const { animationProps, enhancedClickHandler } = useButtonAnimations({
    level: 'dynamic',
    breathing: true,
    ripple: true,
  });

  const { ref, ...otherProps } = animationProps;

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      {...otherProps}
      onClick={enhancedClickHandler(() => console.log('Legacy button clicked!'))}
      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium"
    >
      Enhanced Legacy Button
    </button>
  );
}