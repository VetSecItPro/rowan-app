'use client';

import { Compass, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { Users, Zap, Shield, Compass as CompassIcon } from 'lucide-react';

interface HeroSectionProps {
    onBetaClick: () => void;
    onLaunchClick: () => void;
}

const benefits = [
    {
        icon: Users,
        title: "Built for Households",
        description: "Everything you need in one place.",
        gradient: "from-blue-500 to-indigo-500"
    },
    {
        icon: Zap,
        title: "Real-Time Sync",
        description: "Everything syncs instantly across all devices for seamless coordination",
        gradient: "from-green-500 to-emerald-500"
    },
    {
        icon: Shield,
        title: "Private & Secure",
        description: "Enterprise-grade security protects your family's data",
        gradient: "from-purple-500 to-violet-500"
    },
    {
        icon: CompassIcon,
        title: "Beautifully Simple",
        description: "Intuitive design that makes managing life feel effortless",
        gradient: "from-orange-500 to-amber-500"
    }
];

export function HeroSection({ onBetaClick, onLaunchClick }: HeroSectionProps) {
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    });

    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);

    return (
        <section ref={heroRef} className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    style={{ opacity, scale }}
                    className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center"
                >
                    {/* Left Section - 60% (3/5 columns) */}
                    <div className="lg:col-span-3 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 border border-blue-500/20 dark:border-blue-500/30"
                        >
                            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Your Life Management Hub
                            </span>
                        </motion.div>

                        {/* Logo and Brand Name */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="flex items-center gap-6"
                        >
                            <Image
                                src="/rowan-logo.png"
                                alt="Rowan Logo"
                                width={96}
                                height={96}
                                className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl"
                                priority
                            />
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                Rowan
                            </h1>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-tight"
                        >
                            <span className="text-gray-900 dark:text-white">Your Life, </span>
                            <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent animate-gradient">
                                Organized
                            </span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-serif italic"
                        >
                            Rowan brings tasks, schedules, lists, meals, budgets, and goals into one elegant workspace, so your family stays aligned without constant reminders.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 w-full sm:w-auto mt-2"
                        >
                            <MagneticButton className="group" onClick={onBetaClick}>
                                <div className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold text-base transition-all shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 flex items-center justify-center gap-2">
                                    Access Beta Test
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </MagneticButton>

                            <MagneticButton strength={15} onClick={onLaunchClick}>
                                <div className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg hover:shadow-xl text-center">
                                    Get Notified on Launch
                                </div>
                            </MagneticButton>
                        </motion.div>
                    </div>

                    {/* Right Section - 40% (2/5 columns) - Benefits Grid */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="lg:col-span-2"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            {benefits.map((benefit, index) => {
                                // Map gradients to specific icon colors
                                const iconColorMap: Record<string, string> = {
                                    'from-blue-500 to-indigo-500': 'text-blue-600 dark:text-blue-400',
                                    'from-green-500 to-emerald-500': 'text-green-600 dark:text-green-400',
                                    'from-purple-500 to-violet-500': 'text-purple-600 dark:text-purple-400',
                                    'from-orange-500 to-amber-500': 'text-orange-600 dark:text-orange-400'
                                };

                                return (
                                    <motion.div
                                        key={benefit.title}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                                        className="relative group p-6 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 hover:scale-105 transition-all duration-300 hover:shadow-xl"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.gradient} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                            <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                                                <benefit.icon className={`w-6 h-6 ${iconColorMap[benefit.gradient]}`} />
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">
                                            {benefit.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-serif italic">
                                            {benefit.description}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Veteran-Owned Business Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 1.1 }}
                            className="flex items-center justify-center gap-2 mt-6"
                        >
                            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Veteran-Owned Business
                            </span>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
