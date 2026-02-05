'use client';

import { ArrowRight, Shield, Award, EyeOff, WifiOff } from 'lucide-react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { MagneticButton } from '@/components/ui/magnetic-button';

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
        icon: Award,
        label: "Veteran Owned"
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

    const handleSeeFeaturesClick = () => {
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section ref={heroRef} className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    style={{ opacity, scale }}
                    className="max-w-4xl mx-auto text-center space-y-8"
                >
                    {/* Logo and Brand Name */}
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
                        />
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Rowan
                        </h1>
                    </motion.div>

                    {/* Pain-Point Headline */}
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-tight text-white"
                    >
                        Stop Managing Your Family in{' '}
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            5 Different Apps
                        </span>
                    </motion.h2>

                    {/* Clear Value Proposition */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl sm:text-2xl text-gray-400 leading-relaxed max-w-3xl mx-auto"
                    >
                        Rowan brings tasks, calendars, budgets, meals, and more into one beautiful app — so your household actually stays in sync.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mt-2"
                    >
                        <MagneticButton className="group" onClick={onSignupClick}>
                            <div className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold text-base transition-all shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 flex items-center justify-center gap-2">
                                Try Free for 14 Days
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </MagneticButton>

                        <MagneticButton strength={15} onClick={handleSeeFeaturesClick}>
                            <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl text-center">
                                See How It Works
                            </div>
                        </MagneticButton>
                    </motion.div>

                    {/* Trust Signals - Horizontal Row */}
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

                    {/* Placeholder for HeroDemoAnimation */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="pt-12"
                    >
                        {/* HeroDemoAnimation will be inserted here */}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
