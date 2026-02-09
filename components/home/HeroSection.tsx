'use client';

import { ArrowRight, Shield, RefreshCw, EyeOff, WifiOff } from 'lucide-react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import dynamic from 'next/dynamic';

// FIX-301: Lazy-load HeroDemoAnimation to reduce initial bundle size
const HeroDemoAnimation = dynamic(
  () => import('@/components/home/HeroDemoAnimation'),
  {
    ssr: false,
    loading: () => <div className="w-full h-[400px] bg-gray-800/50 rounded-3xl animate-pulse" />
  }
);

interface HeroSectionProps {
    onSignupClick: () => void;
    onPricingClick: () => void;
}

const trustSignals = [
    {
        icon: Shield,
        label: "Encrypted & Secure"
    },
    {
        icon: RefreshCw,
        label: "Real-Time Sync"
    },
    {
        icon: EyeOff,
        label: "No Ads, Ever"
    },
    {
        icon: WifiOff,
        label: "Works Offline"
    }
];

export function HeroSection({ onSignupClick }: HeroSectionProps) {
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    });

    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);

    return (
        <section ref={heroRef} className="relative pt-20 pb-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    style={{ opacity, scale }}
                    className="max-w-4xl mx-auto text-center space-y-8"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center justify-center gap-6"
                    >
                        <Image
                            src="/rowan-logo.png"
                            alt="Rowan Logo"
                            width={96}
                            height={96}
                            className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl"
                            priority
                            placeholder="empty"
                        />
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Rowan
                        </h1>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-tight text-white"
                    >
                        Your Life.{' '}
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Organized.
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl sm:text-2xl text-gray-400 leading-relaxed max-w-3xl mx-auto"
                    >
                        Rowan brings tasks, calendars, budgets, meals, and more into one beautiful app so your household actually stays in sync.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex items-center justify-center mt-2"
                    >
                        <MagneticButton testId="hero-cta-signup" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]" onClick={onSignupClick}>
                            <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold text-sm transition-all shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 flex items-center justify-center gap-2">
                                Try Free for 14 Days
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </MagneticButton>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-wrap items-center justify-center gap-6 pt-4"
                    >
                        {trustSignals.map((signal, index) => (
                            <motion.div
                                key={signal.label}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                                className="flex items-center gap-2"
                            >
                                <signal.icon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-400">
                                    {signal.label}
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>

                </motion.div>
            </div>
        </section>
    );
}
