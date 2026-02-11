'use client';

import { ArrowRight, Shield, Star, Award } from 'lucide-react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import dynamic from 'next/dynamic';

const AnimatedProductDemo = dynamic(
  () => import('@/components/home/AnimatedProductDemo').then(mod => ({ default: mod.AnimatedProductDemo })),
  {
    ssr: false,
    loading: () => <div className="w-[260px] sm:w-[300px] lg:w-[320px] h-[380px] bg-gray-800/50 rounded-[2rem] animate-pulse mx-auto" />,
  }
);

interface HeroSectionProps {
  onSignupClick: () => void;
  onPricingClick: () => void;
}

const trustSignals = [
  { icon: Star, label: '4.9/5 rating' },
  { icon: Shield, label: 'Encrypted' },
  { icon: Award, label: 'Veteran-Owned' },
];

export function HeroSection({ onSignupClick, onPricingClick }: HeroSectionProps) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);

  return (
    <section ref={heroRef} className="relative pt-16 sm:pt-20 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div style={{ opacity, scale }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left — Text */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-tight text-white mb-4"
              >
                Stop being your family&apos;s{' '}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  memory.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8"
              >
                Tasks, calendars, budgets, meals, and more — in one app that actually keeps your household in sync.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6"
              >
                <MagneticButton
                  testId="hero-cta-signup"
                  className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                  onClick={onSignupClick}
                >
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold text-sm transition-all shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 flex items-center justify-center gap-2">
                    Start Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </MagneticButton>

                <button
                  onClick={onPricingClick}
                  className="px-6 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  See How It Works
                </button>
              </motion.div>

              {/* Trust signals */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-5"
              >
                {trustSignals.map((signal) => (
                  <div key={signal.label} className="flex items-center gap-1.5">
                    <signal.icon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-500">{signal.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — Product Demo */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex justify-center lg:justify-end"
            >
              <AnimatedProductDemo />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
