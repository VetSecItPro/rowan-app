'use client';

import { ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { MagneticButton } from '@/components/ui/magnetic-button';
const Player = dynamic(() => import('@remotion/player').then(m => ({ default: m.Player })), { ssr: false });
import { HeroShowcase } from '@/remotion/compositions/HeroShowcase';

interface HeroSectionProps {
  onSignupClick: () => void;
  onPricingClick: () => void;
}

/** Renders the hero section with headline, description, and CTA buttons. */
export function HeroSection({ onSignupClick, onPricingClick: _onPricingClick }: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [1, 1] : [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [1, 1] : [1, 0.8]);

  const dur = prefersReducedMotion ? 0.01 : 0.6;
  const durSlow = prefersReducedMotion ? 0.01 : 0.8;

  return (
    <section ref={heroRef} className="relative pt-16 sm:pt-20 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div style={{ opacity, scale }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left — Text */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur }}
                className="flex items-center justify-center lg:justify-start gap-3 mb-6"
              >
                <Image
                  src="/rowan-logo.png"
                  alt="Rowan Logo"
                  width={56}
                  height={56}
                  className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-2xl"
                  priority
                  placeholder="empty"
                />
                <span className="text-3xl sm:text-4xl font-display font-extrabold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Rowan
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur, delay: prefersReducedMotion ? 0 : 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-tight text-white mb-4"
              >
                Stop being your family&apos;s{' '}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  memory.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur, delay: prefersReducedMotion ? 0 : 0.2 }}
                className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8"
              >
                Tasks, calendars, budgets, meals, and more in one app that actually keeps your household in sync.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur, delay: prefersReducedMotion ? 0 : 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6"
              >
                <MagneticButton
                  testId="hero-cta-signup"
                  className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  onClick={onSignupClick}
                >
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold text-sm transition-all shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 active:scale-[0.97] flex items-center justify-center gap-2">
                    Start Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </MagneticButton>

                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-full"
                >
                  See How It Works
                </a>
              </motion.div>

            </div>

            {/* Right — Product Demo */}
            <motion.div
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: durSlow, delay: prefersReducedMotion ? 0 : 0.3 }}
              className="flex justify-center lg:justify-end"
            >
              <div className="w-full max-w-[680px] rounded-2xl overflow-hidden border border-gray-800/40 bg-black shadow-2xl shadow-black/40">
                <Player
                  component={HeroShowcase}
                  durationInFrames={300}
                  fps={30}
                  compositionWidth={1280}
                  compositionHeight={720}
                  style={{ width: '100%' }}
                  loop
                  autoPlay
                  controls={false}
                  showVolumeControls={false}
                  clickToPlay={false}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
