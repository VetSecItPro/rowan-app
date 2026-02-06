'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { MagneticButton } from '@/components/ui/magnetic-button';

// ---------------------------------------------------------------------------
// Static color map — avoids dynamic Tailwind class construction so that
// purging works correctly. Each key maps a Tailwind color name to the actual
// CSS values we need for inline styles and the small set of static classes
// that are safe to include.
// ---------------------------------------------------------------------------
const COLOR_MAP: Record<
  string,
  {
    hex: string;
    hexSecondary: string;
    badgeBg: string;
    badgeText: string;
    checkBg: string;
    checkText: string;
    shadow: string;
  }
> = {
  blue: {
    hex: '#3b82f6',
    hexSecondary: '#06b6d4',
    badgeBg: 'bg-blue-900/30',
    badgeText: 'text-blue-300',
    checkBg: 'bg-blue-500/20',
    checkText: 'text-blue-400',
    shadow: 'shadow-blue-500/20',
  },
  purple: {
    hex: '#a855f7',
    hexSecondary: '#6366f1',
    badgeBg: 'bg-purple-900/30',
    badgeText: 'text-purple-300',
    checkBg: 'bg-purple-500/20',
    checkText: 'text-purple-400',
    shadow: 'shadow-purple-500/20',
  },
  pink: {
    hex: '#ec4899',
    hexSecondary: '#f43f5e',
    badgeBg: 'bg-pink-900/30',
    badgeText: 'text-pink-300',
    checkBg: 'bg-pink-500/20',
    checkText: 'text-pink-400',
    shadow: 'shadow-pink-500/20',
  },
  green: {
    hex: '#22c55e',
    hexSecondary: '#10b981',
    badgeBg: 'bg-green-900/30',
    badgeText: 'text-green-300',
    checkBg: 'bg-green-500/20',
    checkText: 'text-green-400',
    shadow: 'shadow-green-500/20',
  },
  emerald: {
    hex: '#10b981',
    hexSecondary: '#14b8a6',
    badgeBg: 'bg-emerald-900/30',
    badgeText: 'text-emerald-300',
    checkBg: 'bg-emerald-500/20',
    checkText: 'text-emerald-400',
    shadow: 'shadow-emerald-500/20',
  },
  orange: {
    hex: '#f97316',
    hexSecondary: '#f59e0b',
    badgeBg: 'bg-orange-900/30',
    badgeText: 'text-orange-300',
    checkBg: 'bg-orange-500/20',
    checkText: 'text-orange-400',
    shadow: 'shadow-orange-500/20',
  },
  amber: {
    hex: '#f59e0b',
    hexSecondary: '#eab308',
    badgeBg: 'bg-amber-900/30',
    badgeText: 'text-amber-300',
    checkBg: 'bg-amber-500/20',
    checkText: 'text-amber-400',
    shadow: 'shadow-amber-500/20',
  },
  indigo: {
    hex: '#6366f1',
    hexSecondary: '#8b5cf6',
    badgeBg: 'bg-indigo-900/30',
    badgeText: 'text-indigo-300',
    checkBg: 'bg-indigo-500/20',
    checkText: 'text-indigo-400',
    shadow: 'shadow-indigo-500/20',
  },
  yellow: {
    hex: '#eab308',
    hexSecondary: '#f59e0b',
    badgeBg: 'bg-yellow-900/30',
    badgeText: 'text-yellow-300',
    checkBg: 'bg-yellow-500/20',
    checkText: 'text-yellow-400',
    shadow: 'shadow-yellow-500/20',
  },
  cyan: {
    hex: '#06b6d4',
    hexSecondary: '#3b82f6',
    badgeBg: 'bg-cyan-900/30',
    badgeText: 'text-cyan-300',
    checkBg: 'bg-cyan-500/20',
    checkText: 'text-cyan-400',
    shadow: 'shadow-cyan-500/20',
  },
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface FeaturePageLayoutProps {
  featureName: string;
  tagline: string;
  headline: string;
  description: string;
  colorScheme: {
    /** Tailwind color name key, e.g. 'blue', 'purple', 'amber' */
    primary: string;
    secondary: string;
    /** Tailwind gradient classes, e.g. 'from-blue-500 to-cyan-500' */
    gradient: string;
  };
  benefits: Array<{
    icon: React.ElementType;
    title: string;
    description: string;
  }>;
  detailBullets: string[];
  demoComponent?: React.ReactNode;
  ctaText?: string;
  onSignupClick: () => void;
  /** Optional RelatedFeatures section to render before Footer */
  relatedFeaturesSection?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helper: resolve colors from the static map
// ---------------------------------------------------------------------------
function resolveColor(key: string) {
  return COLOR_MAP[key] ?? COLOR_MAP.blue;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FeaturePageLayout({
  featureName,
  tagline,
  headline,
  description,
  colorScheme,
  benefits,
  detailBullets,
  demoComponent,
  ctaText = 'Try Free for 14 Days',
  onSignupClick,
  relatedFeaturesSection,
}: FeaturePageLayoutProps) {
  const primary = resolveColor(colorScheme.primary);
  const benefitColors = [
    resolveColor(colorScheme.primary),
    resolveColor(colorScheme.secondary),
    resolveColor(colorScheme.primary),
  ];

  return (
    <div className="min-h-screen bg-gray-900 overflow-x-hidden">
      <PublicHeader />

      <main>
        {/* ----------------------------------------------------------------
            1. HERO SECTION
        ---------------------------------------------------------------- */}
        <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Radial gradient background using feature color */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              background: `radial-gradient(45% 45% at 50% 0%, ${primary.hex}1a, transparent)`,
            }}
          />

          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="text-center"
            >
              {/* Badge / tagline */}
              <motion.div
                variants={itemVariants}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${primary.badgeBg} ${primary.badgeText} text-sm font-medium mb-8`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{tagline}</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6"
              >
                {headline.includes('|') ? (
                  <>
                    {headline.split('|')[0]}
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(to right, ${primary.hex}, ${primary.hexSecondary})`,
                      }}
                    >
                      {headline.split('|')[1]}
                    </span>
                    {headline.split('|')[2] ?? ''}
                  </>
                ) : (
                  headline
                )}
              </motion.h1>

              {/* Description */}
              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light mb-10"
              >
                {description}
              </motion.p>

              {/* CTAs */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              >
                <MagneticButton className="group" onClick={onSignupClick}>
                  <div
                    className={`px-6 py-3 text-white rounded-full font-semibold text-sm transition-all shadow-xl ${primary.shadow} flex items-center justify-center gap-2`}
                    style={{
                      backgroundImage: `linear-gradient(to right, ${primary.hex}, ${primary.hexSecondary})`,
                    }}
                  >
                    {ctaText}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </MagneticButton>

                <MagneticButton
                  strength={15}
                  onClick={() => (window.location.href = '/pricing')}
                >
                  <div className="px-6 py-3 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-sm transition-all shadow-lg text-center">
                    View Pricing
                  </div>
                </MagneticButton>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ----------------------------------------------------------------
            2. DEMO SECTION (optional)
        ---------------------------------------------------------------- */}
        {demoComponent && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
              >
                {demoComponent}
              </motion.div>
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------------
            3. BENEFITS GRID
        ---------------------------------------------------------------- */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => {
                const color = benefitColors[index % benefitColors.length];
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                  >
                    <SpotlightCard className="p-8 h-full">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                        style={{ backgroundColor: `${color.hex}1a` }}
                      >
                        <benefit.icon
                          className="w-6 h-6"
                          style={{ color: color.hex }}
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed">
                        {benefit.description}
                      </p>
                    </SpotlightCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------
            4. DETAIL BULLETS (centered)
        ---------------------------------------------------------------- */}
        <section className="py-20 bg-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl mx-auto text-center"
            >
              <h2 className="text-4xl font-bold text-white mb-8">
                {featureName}, Simplified
              </h2>
              <div className="space-y-4">
                {detailBullets.map((bullet, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${primary.checkBg}`}
                    >
                      <Check className={`w-4 h-4 ${primary.checkText}`} />
                    </div>
                    <span className="text-lg text-gray-300 font-medium">
                      {bullet}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ----------------------------------------------------------------
            5. CTA REPEAT
        ---------------------------------------------------------------- */}
        <section className="py-24 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-gray-400 mb-8">
                No credit card required. Start organizing your family life
                today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <MagneticButton className="group" onClick={onSignupClick}>
                  <div
                    className={`px-6 py-3 text-white rounded-full font-semibold text-sm transition-all shadow-xl ${primary.shadow} flex items-center justify-center gap-2`}
                    style={{
                      backgroundImage: `linear-gradient(to right, ${primary.hex}, ${primary.hexSecondary})`,
                    }}
                  >
                    {ctaText}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </MagneticButton>

                <MagneticButton
                  strength={15}
                  onClick={() => (window.location.href = '/pricing')}
                >
                  <div className="px-6 py-3 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-sm transition-all shadow-lg text-center">
                    View Pricing
                  </div>
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Related Features section (above footer) */}
      {relatedFeaturesSection}

      <Footer />
    </div>
  );
}
