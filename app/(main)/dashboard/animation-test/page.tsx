'use client';

import { CTAButton, PremiumButton } from '@/components/ui/EnhancedButton';
import { Plus, Star, Sparkles } from 'lucide-react';

export default function AnimationTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">Button Animation Test</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg space-y-4">
            <h2 className="font-semibold">CTA Button (Dashboard)</h2>
            <CTAButton
              feature="dashboard"
              icon={<Plus className="w-4 h-4" />}
            >
              Dashboard CTA
            </CTAButton>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg space-y-4">
            <h2 className="font-semibold">Premium Button</h2>
            <PremiumButton
              feature="tasks"
              icon={<Star className="w-5 h-5" />}
            >
              Premium Tasks
            </PremiumButton>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg space-y-4">
            <h2 className="font-semibold">Calendar Button</h2>
            <CTAButton
              feature="calendar"
              breathing
              magnetic
              ripple
              icon={<Sparkles className="w-4 h-4" />}
            >
              Calendar Magic
            </CTAButton>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg space-y-4">
            <h2 className="font-semibold">Messages Button</h2>
            <CTAButton
              feature="messages"
              animationLevel="premium"
              icon={<Plus className="w-4 h-4" />}
            >
              Send Message
            </CTAButton>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg space-y-4">
            <h2 className="font-semibold">Shopping Button</h2>
            <PremiumButton
              feature="shopping"
              variant="primary"
            >
              Add to Cart
            </PremiumButton>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg space-y-4">
            <h2 className="font-semibold">Goals Button</h2>
            <CTAButton
              feature="goals"
              size="lg"
              breathing
              magnetic
            >
              Achieve Goal
            </CTAButton>
          </div>

        </div>

        <div className="bg-purple-600 p-8 rounded-xl text-white">
          <h2 className="text-xl font-semibold mb-4">Dashboard Context Test</h2>
          <CTAButton
            feature="dashboard"
            breathing
            magnetic
            ripple
            animationLevel="premium"
            icon={<Plus className="w-4 h-4" />}
            size="md"
            // NO custom className - should work
          >
            Create Your Space (No Custom Classes)
          </CTAButton>
        </div>

        <div className="bg-gray-200 dark:bg-gray-700 p-4 rounded text-sm">
          <p><strong>Expected Behavior:</strong></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>All buttons should have gentle breathing animations (3-second pulse)</li>
            <li>Hover should trigger scale and glow effects</li>
            <li>Premium buttons should have magnetic attraction to cursor</li>
            <li>Click should trigger ripple effects</li>
            <li>Each button should have feature-appropriate colors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}