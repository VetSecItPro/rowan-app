'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function ComparisonSection() {
    return (
        <section className="relative py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
                        One App. Not Five.
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 font-light">
                        Stop juggling separate apps for every part of family life
                    </p>
                </motion.div>

                {/* Mobile scroll hint */}
                <div className="md:hidden flex items-center justify-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Swipe to see all columns</span>
                    <ArrowRight className="w-3 h-3 animate-pulse" />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
                >
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-4 px-4 font-display font-semibold text-gray-900 dark:text-white">Feature</th>
                                <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">Task Apps</th>
                                <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">Calendars</th>
                                <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">List Apps</th>
                                <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">Meal Apps</th>
                                <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">Budget Apps</th>
                                <th className="text-center py-4 px-3 font-display font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">Rowan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {[
                                { feature: 'Tasks & To-dos', cols: [true, false, false, false, false, true] },
                                { feature: 'Family Calendar', cols: [false, true, false, false, false, true] },
                                { feature: 'Shopping Lists', cols: [false, false, true, false, false, true] },
                                { feature: 'Meal Planning', cols: [false, false, false, true, false, true] },
                                { feature: 'Budget Tracking', cols: [false, false, false, false, true, true] },
                                { feature: 'Family Sharing', cols: ['some', 'some', 'some', 'rare', 'rare', true] },
                                { feature: 'One Login', cols: [false, false, false, false, false, true] },
                                { feature: 'Everything Synced', cols: [false, false, false, false, false, true] },
                            ].map((row, idx) => (
                                <tr key={row.feature} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{row.feature}</td>
                                    {row.cols.map((val, colIdx) => (
                                        <td key={colIdx} className={`text-center py-3 px-3 ${colIdx === 5 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            {val === true ? (
                                                <span className={`inline-block w-5 h-5 rounded-full ${colIdx === 5 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-green-500'} text-white text-xs flex items-center justify-center mx-auto`}>✓</span>
                                            ) : val === 'some' ? (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs">Some</span>
                                            ) : val === 'rare' ? (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs">Rare</span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">—</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-8 text-gray-500 dark:text-gray-400 font-serif italic"
                >
                    Why manage five apps when one does it all?
                </motion.p>
            </div>
        </section>
    );
}
