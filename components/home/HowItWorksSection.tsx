'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { Home, UserPlus, Grid3x3 } from 'lucide-react';

const steps = [
    {
        number: 1,
        title: "Create Your Space",
        description: "Set up your household in seconds. Name it, customize it, make it yours.",
        icon: Home,
        gradient: "from-blue-500 to-cyan-500"
    },
    {
        number: 2,
        title: "Invite Your People",
        description: "Add your partner, kids, roommates, anyone who shares your life.",
        icon: UserPlus,
        gradient: "from-purple-500 to-blue-500"
    },
    {
        number: 3,
        title: "Manage Everything Together",
        description: "Tasks, calendars, budgets, meals, and more. All in one place, always in sync.",
        icon: Grid3x3,
        gradient: "from-cyan-500 to-emerald-500"
    }
];

export function HowItWorksSection() {
    const prefersReducedMotion = useReducedMotion();
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: false, margin: "-50px" });

    return (
        <section id="how-it-works" ref={sectionRef} className="relative py-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
                    transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight mb-4">
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            How It Works
                        </span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Get started with Rowan in three simple steps
                    </p>
                </motion.div>

                <div className="relative">
                    <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-px bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-emerald-500/50" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={step.number}
                                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 50 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: prefersReducedMotion ? 0 : 50 }}
                                    transition={{
                                        duration: prefersReducedMotion ? 0.01 : 0.6,
                                        delay: prefersReducedMotion ? 0 : index * 0.15,
                                        ease: [0.25, 0.4, 0.25, 1]
                                    }}
                                    className="relative flex flex-col items-center text-center"
                                >
                                    <div className="relative mb-6">
                                        <div className={`w-12 h-12 rounded-full border-2 border-transparent bg-gradient-to-r ${step.gradient} p-[2px]`}>
                                            <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                                                <span className={`text-xl font-display font-bold bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                                                    {step.number}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} p-0.5 shadow-lg`}>
                                            <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center">
                                                <Icon className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-semibold text-white mb-3">
                                        {step.title}
                                    </h3>

                                    <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                                        {step.description}
                                    </p>

                                    {index < steps.length - 1 && (
                                        <div className="md:hidden absolute -bottom-4 left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-blue-500/50 to-purple-500/50" />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
