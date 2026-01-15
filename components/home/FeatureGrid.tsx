'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { CheckSquare, Calendar, Bell, MessageCircle, ShoppingCart, UtensilsCrossed, Home, Target, ArrowRight, Sun } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';

const features = [
    {
        title: "Tasks & Chores",
        description: "Organize daily tasks and household chores together with smart assignments and completion tracking",
        icon: CheckSquare,
        gradient: "from-blue-500 via-cyan-500 to-blue-600",
        href: "/features/tasks",
        size: "large" // Takes 2 columns
    },
    {
        title: "Shared Calendar",
        description: "Keep everyone in sync with a shared calendar that works for the whole family",
        icon: Calendar,
        gradient: "from-indigo-500 via-blue-500 to-indigo-600",
        href: "/features/calendar",
        size: "normal"
    },
    {
        title: "Smart Reminders",
        description: "Never miss important moments with intelligent reminders that know your schedule",
        icon: Bell,
        gradient: "from-pink-500 via-rose-500 to-pink-600",
        href: "/features/reminders",
        size: "normal"
    },
    {
        title: "Built-in Messaging",
        description: "Communicate seamlessly with your family in dedicated conversation threads",
        icon: MessageCircle,
        gradient: "from-green-500 via-emerald-500 to-green-600",
        href: "/features/messages",
        size: "normal"
    },
    {
        title: "Shopping Lists",
        description: "Collaborative shopping that syncs in real-time so everyone stays on the same page",
        icon: ShoppingCart,
        gradient: "from-emerald-500 via-teal-500 to-emerald-600",
        href: "/features/shopping",
        size: "large" // Takes 2 columns
    },
    {
        title: "Meal Planning",
        description: "Plan your meals for the week with recipe management and ingredient tracking",
        icon: UtensilsCrossed,
        gradient: "from-orange-500 via-amber-500 to-orange-600",
        href: "/features/meals",
        size: "normal"
    },
    {
        title: "Budget & Expenses",
        description: "Track your budget and manage household expenses with detailed insights",
        icon: Home,
        gradient: "from-amber-500 via-yellow-500 to-amber-600",
        href: "/features/budget",
        size: "normal"
    },
    {
        title: "Goals & Milestones",
        description: "Track your goals and celebrate achievements together as a family",
        icon: Target,
        gradient: "from-blue-600 via-indigo-500 to-blue-700",
        href: "/features/goals",
        size: "normal"
    },
    {
        title: "Daily Check-In",
        description: "Start each day with intention — reflect on your mood, set priorities, and stay connected with your family's rhythm",
        icon: Sun,
        gradient: "from-yellow-400 via-orange-400 to-rose-400",
        href: "/features/daily-check-in",
        size: "large"
    },
];

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, margin: "-50px" });
    const Icon = feature.icon;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 100, scale: 0.8 }}
            transition={{
                duration: 0.7,
                delay: index * 0.15,
                ease: [0.25, 0.4, 0.25, 1]
            }}
            className={`group relative ${feature.size === 'large' ? 'md:col-span-2' : 'md:col-span-1'}`}
        >
            <Link
                href={feature.href}
                prefetch={true}
            >
                <SpotlightCard className="h-full bg-gradient-to-br from-white/80 from-gray-800/80 to-gray-900/40 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl">
                    <div className="p-6 h-full relative z-10">
                        {/* Animated gradient background on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                        {/* Icon + Title row */}
                        <div className="relative flex items-center gap-4 mb-4">
                            {/* Glassmorphic icon container */}
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                                <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center">
                                    <Icon className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-bold tracking-tight text-white group-hover:translate-x-1 transition-transform duration-300">
                                {feature.title}
                            </h3>
                        </div>

                        {/* Description below */}
                        <p className="relative text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300 font-serif italic">
                            {feature.description}
                        </p>

                        {/* Arrow icon that appears on hover */}
                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                            <ArrowRight className="w-5 h-5 text-gray-500" />
                        </div>
                    </div>
                </SpotlightCard>
            </Link>
        </motion.div>
    );
}

export function FeatureGrid() {
    return (
        <section id="features" className="relative pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, margin: "-50px" }}
                    transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
                    className="text-center mb-16"
                >
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white mb-4"
                    >
                        Everything You Need
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-xl text-gray-300 max-w-2xl mx-auto font-light"
                    >
                        Powerful features designed to simplify your family's daily life
                    </motion.p>
                </motion.div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <FeatureCard key={feature.title} feature={feature} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}
