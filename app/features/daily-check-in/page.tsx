'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { Sun, Check, Sparkles, MessageCircle, Heart, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';
import { MagneticButton } from '@/components/ui/magnetic-button';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.25, 0.4, 0.25, 1],
        },
    },
};

export default function DailyCheckInFeaturePage() {
    const router = useRouter();
    const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

    const handleBetaSuccess = (inviteCode?: string, email?: string, firstName?: string, lastName?: string) => {
        if (inviteCode) {
            const params = new URLSearchParams();
            params.set('beta_code', inviteCode);
            if (email) params.set('email', email);
            if (firstName) params.set('first_name', firstName);
            if (lastName) params.set('last_name', lastName);
            router.push(`/signup?${params.toString()}`);
        } else {
            router.push('/signup');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 overflow-x-hidden">
            <Header
                onBetaClick={() => setIsBetaModalOpen(true)}
                onLaunchClick={() => setIsLaunchModalOpen(true)}
                isPublicFeaturePage={true}
            />

            <main>
                {/* Hero Section */}
                <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_0%,rgba(251,191,36,0.1),transparent)] bg-[radial-gradient(45%_45%_at_50%_0%,rgba(180,83,9,0.05),transparent)]" />

                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={containerVariants}
                            className="text-center"
                        >
                            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-900/30 text-yellow-300 text-sm font-medium mb-8">
                                <Sparkles className="w-4 h-4" />
                                <span>Morning Rituals</span>
                            </motion.div>

                            <motion.h1
                                variants={itemVariants}
                                className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6"
                            >
                                Daily <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">Check-In</span>
                            </motion.h1>

                            <motion.p
                                variants={itemVariants}
                                className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light mb-10"
                            >
                                Start each day with intention. Reflect on your mood, set priorities, and stay connected
                                with your family&apos;s rhythm in just a few minutes.
                            </motion.p>

                            <motion.div
                                variants={itemVariants}
                                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
                            >
                                <MagneticButton className="group" onClick={() => setIsBetaModalOpen(true)}>
                                    <div className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                                        Access Beta Test
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </MagneticButton>

                                <MagneticButton strength={15} onClick={() => setIsLaunchModalOpen(true)}>
                                    <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
                                        Get Notified on Launch
                                    </div>
                                </MagneticButton>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Feature Grid */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: Heart,
                                    title: "Mood Tracking",
                                    description: "Quickly log how you're feeling and see how your mood patterns evolve over time with beautiful visualizations.",
                                    color: "rose"
                                },
                                {
                                    icon: Sun,
                                    title: "Daily Focus",
                                    description: "Identify your one 'Must-Do' for the day to ensure you're making progress on what truly matters most.",
                                    color: "orange"
                                },
                                {
                                    icon: MessageCircle,
                                    title: "Gratitude",
                                    description: "Take a moment to appreciate the small wins. Practice mindfulness by noting something you're thankful for.",
                                    color: "yellow"
                                }
                            ].map((item, index) => (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.6 }}
                                >
                                    <SpotlightCard className="p-8 h-full">
                                        <div className={`w-12 h-12 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center mb-6`}>
                                            <item.icon className={`w-6 h-6 text-${item.color}-500`} />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                                        <p className="text-gray-400 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </SpotlightCard>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Details Section */}
                <section className="py-20 bg-gray-800/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <h2 className="text-4xl font-bold text-white mb-8">
                                    Nurture Your Well-being Each Morning
                                </h2>
                                <div className="space-y-6">
                                    {[
                                        "Simplified ritual designed to take less than 3 minutes",
                                        "Synchronized with your family to see everyone's rhythm",
                                        "Historical trends and emotional insights",
                                        "Customizable prompts to match your personal goals",
                                        "Integration with tasks and reminders for seamless planning"
                                    ].map((feature, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                                                <Check className="w-4 h-4 text-orange-400" />
                                            </div>
                                            <span className="text-lg text-gray-300 font-medium">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="relative aspect-video rounded-3xl overflow-hidden bg-gradient-to-br from-yellow-400 via-orange-400 to-rose-400 shadow-2xl"
                            >
                                <div className="absolute inset-0 flex items-center justify-center text-white/20">
                                    <Sun className="w-32 h-32 animate-spin-slow" />
                                </div>
                                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-white font-bold text-xl drop-shadow-md">Ritual Preview</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="py-24 text-center">
                    <div className="max-w-4xl mx-auto px-4">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
                            Ready to start your day with Rowan?
                        </h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <MagneticButton className="group" onClick={() => setIsBetaModalOpen(true)}>
                                <div className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                                    Access Beta Test
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </MagneticButton>

                            <MagneticButton strength={15} onClick={() => setIsLaunchModalOpen(true)}>
                                <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
                                    Get Notified on Launch
                                </div>
                            </MagneticButton>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />

            <BetaAccessModal
                isOpen={isBetaModalOpen}
                onClose={() => setIsBetaModalOpen(false)}
                onSuccess={handleBetaSuccess}
                onSwitchToLaunch={() => {
                    setIsBetaModalOpen(false);
                    setIsLaunchModalOpen(true);
                }}
            />
            <LaunchNotificationModal
                isOpen={isLaunchModalOpen}
                onClose={() => setIsLaunchModalOpen(false)}
            />
        </div>
    );
}
