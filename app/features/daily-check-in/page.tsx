'use client';

import { motion, Variants } from 'framer-motion';
import { Sun, Check, Sparkles, MessageCircle, Heart, ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';
import { SpotlightCard } from '@/components/ui/spotlight-card';
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
    return (
        <div className="min-h-screen bg-gray-900 overflow-x-hidden">
            <PublicHeader />

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
                                <MagneticButton className="group" onClick={() => window.location.href = '/signup'}>
                                    <div className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                                        Sign Up Free
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </MagneticButton>

                                <MagneticButton strength={15} onClick={() => window.location.href = '/pricing'}>
                                    <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
                                        View Pricing
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
                                className="relative aspect-video rounded-3xl overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl"
                            >
                                <div className="h-full flex flex-col">
                                    <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sun className="w-4 h-4 text-orange-400" />
                                            <span className="text-sm font-semibold text-white">Morning Check-In</span>
                                        </div>
                                        <span className="text-[11px] text-gray-500">Mon, Feb 3</span>
                                    </div>
                                    <div className="flex-1 px-5 py-4 space-y-4 overflow-hidden">
                                        {/* Mood */}
                                        <div>
                                            <div className="text-[10px] text-gray-500 mb-2">How are you feeling?</div>
                                            <div className="flex gap-3">
                                                {[
                                                    { emoji: "😔", label: "Low" },
                                                    { emoji: "😐", label: "Okay" },
                                                    { emoji: "😊", label: "Good", active: true },
                                                    { emoji: "😄", label: "Great" },
                                                ].map((m) => (
                                                    <div key={m.label} className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg ${m.active ? 'bg-orange-500/20 border border-orange-500/40' : 'bg-gray-800/50'}`}>
                                                        <span className="text-lg">{m.emoji}</span>
                                                        <span className={`text-[9px] ${m.active ? 'text-orange-300' : 'text-gray-500'}`}>{m.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Energy & Priority */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-[10px] text-gray-500 mb-1.5">Energy level</div>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map((i) => (
                                                        <div key={i} className={`flex-1 h-2 rounded-full ${i <= 3 ? 'bg-orange-400' : 'bg-gray-700'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-500 mb-1.5">Today&apos;s priority</div>
                                                <div className="text-[11px] text-gray-200">Finish tax documents</div>
                                            </div>
                                        </div>
                                        {/* Gratitude */}
                                        <div>
                                            <div className="text-[10px] text-gray-500 mb-1.5">Grateful for...</div>
                                            <div className="text-[11px] text-gray-300 bg-gray-800/50 rounded-lg px-3 py-2 italic">Beautiful weather this weekend with the kids</div>
                                        </div>
                                    </div>
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
                            <MagneticButton className="group" onClick={() => window.location.href = '/signup'}>
                                <div className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                                    Sign Up Free
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </MagneticButton>

                            <MagneticButton strength={15} onClick={() => window.location.href = '/pricing'}>
                                <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
                                    View Pricing
                                </div>
                            </MagneticButton>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />

        </div>
    );
}
