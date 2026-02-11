'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function PainPointsSection() {
    const prefersReducedMotion = useReducedMotion();

    return (
        <section className="relative py-1 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
                {/* Divider */}
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mx-auto mb-10" />
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: prefersReducedMotion ? 0.01 : 0.8 }}
                    className="text-lg text-gray-400 mb-8"
                >
                    Sound familiar?
                </motion.p>

                <div className="space-y-4">
                    {[
                        "Who was supposed to pick up the kids?",
                        "Did we already buy milk?",
                        "When is that appointment again?"
                    ].map((quote, index) => (
                        <motion.p
                            key={quote}
                            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : (index % 2 === 0 ? -20 : 20) }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: prefersReducedMotion ? 0 : index * 0.15 }}
                            className="text-xl sm:text-2xl text-gray-300 font-serif italic"
                        >
                            &quot;{quote}&quot;
                        </motion.p>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: prefersReducedMotion ? 0 : 0.6 }}
                    className="mt-10"
                >
                    <span className="text-2xl sm:text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        There&apos;s a better way to run your household.
                    </span>
                </motion.div>
            </div>
        </section>
    );
}
