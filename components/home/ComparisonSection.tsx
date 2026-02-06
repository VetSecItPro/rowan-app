'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  Calendar,
  CheckSquare,
  DollarSign,
  BookOpen,
  MessageCircle,
  ArrowRight,
  ShoppingCart,
  Bell,
  Target,
  Sparkles,
  Heart,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';

const scatteredApps = [
  { label: 'Calendar app', icon: Calendar, x: '8%', y: '12%', rotate: -6, size: 'w-14 h-14 sm:w-16 sm:h-16' },
  { label: 'Todo app', icon: CheckSquare, x: '55%', y: '6%', rotate: 8, size: 'w-12 h-12 sm:w-14 sm:h-14' },
  { label: 'Budget spreadsheet', icon: DollarSign, x: '30%', y: '42%', rotate: -3, size: 'w-16 h-16 sm:w-[72px] sm:h-[72px]' },
  { label: 'Recipe bookmarks', icon: BookOpen, x: '65%', y: '48%', rotate: 12, size: 'w-11 h-11 sm:w-[52px] sm:h-[52px]' },
  { label: 'Family group chat', icon: MessageCircle, x: '18%', y: '72%', rotate: -9, size: 'w-[52px] h-[52px] sm:w-[60px] sm:h-[60px]' },
];

const rowanFeatures = [
  { icon: CheckSquare, color: 'text-blue-400' },
  { icon: Calendar, color: 'text-purple-400' },
  { icon: Bell, color: 'text-pink-400' },
  { icon: MessageCircle, color: 'text-green-400' },
  { icon: ShoppingCart, color: 'text-emerald-400' },
  { icon: UtensilsCrossed, color: 'text-orange-400' },
  { icon: Wallet, color: 'text-amber-400' },
  { icon: Target, color: 'text-indigo-400' },
  { icon: Sparkles, color: 'text-yellow-400' },
  { icon: Heart, color: 'text-rose-400' },
];

export function ComparisonSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-white mb-4">
            One app instead of{' '}
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              five
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Stop context-switching between apps that were never designed to work together
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4 items-stretch relative">
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <motion.div
              initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.5, delay: prefersReducedMotion ? 0 : 0.6 }}
              className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shadow-xl"
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: prefersReducedMotion ? 0 : 0.1 }}
            className="relative"
          >
            <div className="rounded-2xl bg-gray-800/40 border border-red-500/20 p-6 sm:p-8 h-full transform rotate-[-0.5deg] hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <h3 className="text-lg font-bold text-gray-300">
                  Without Rowan
                </h3>
              </div>

              <div className="relative h-64 sm:h-72">
                {scatteredApps.map((app, index) => {
                  const Icon = app.icon;
                  return (
                    <motion.div
                      key={app.label}
                      initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: prefersReducedMotion ? 0.01 : 0.4,
                        delay: prefersReducedMotion ? 0 : 0.3 + index * 0.1,
                        type: prefersReducedMotion ? undefined : 'spring',
                        stiffness: prefersReducedMotion ? undefined : 200,
                      }}
                      className="absolute"
                      style={{
                        left: app.x,
                        top: app.y,
                        transform: `rotate(${app.rotate}deg)`,
                      }}
                    >
                      <div className={`${app.size} rounded-xl bg-gray-700/60 border border-gray-600/40 flex flex-col items-center justify-center gap-1 p-2 shadow-lg`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        <span className="text-[9px] sm:text-[10px] text-gray-500 text-center leading-tight whitespace-nowrap">
                          {app.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 400 300"
                  fill="none"
                >
                  {!prefersReducedMotion && (
                    <>
                      <motion.path
                        d="M 60 50 Q 150 120 260 40"
                        stroke="rgba(239,68,68,0.15)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.8 }}
                      />
                      <motion.path
                        d="M 150 140 Q 200 200 100 240"
                        stroke="rgba(239,68,68,0.15)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.9 }}
                      />
                      <motion.path
                        d="M 280 160 Q 200 100 80 200"
                        stroke="rgba(239,68,68,0.15)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 1.0 }}
                      />
                    </>
                  )}
                </svg>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-2xl" role="img" aria-label="Overwhelmed face">
                  😵
                </span>
                <span className="text-sm text-gray-500">
                  5 apps, 5 logins, nothing synced
                </span>
              </div>
            </div>
          </motion.div>

          <div className="flex md:hidden items-center justify-center -my-2">
            <motion.div
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.4, delay: prefersReducedMotion ? 0 : 0.4 }}
              className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center rotate-90"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: prefersReducedMotion ? 0 : 0.3 }}
            className="relative"
          >
            <div className="rounded-2xl bg-gray-800/40 border border-cyan-500/20 p-6 sm:p-8 h-full relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-cyan-500/80" />
                <h3 className="text-lg font-bold text-white">With Rowan</h3>
              </div>

              <div className="relative h-64 sm:h-72 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: prefersReducedMotion ? 0.01 : 0.5, delay: prefersReducedMotion ? 0 : 0.5 }}
                  className="w-full max-w-xs"
                >
                  <div className="rounded-t-xl bg-gray-900/80 border border-gray-700/50 border-b-0 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span className="text-xs font-semibold text-gray-300">
                      Rowan Dashboard
                    </span>
                  </div>

                  <div className="rounded-b-xl bg-gray-900/60 border border-gray-700/50 border-t-0 p-4">
                    <div className="grid grid-cols-5 gap-3">
                      {rowanFeatures.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{
                              duration: prefersReducedMotion ? 0.01 : 0.3,
                              delay: prefersReducedMotion ? 0 : 0.7 + index * 0.05,
                              type: prefersReducedMotion ? undefined : 'spring',
                              stiffness: prefersReducedMotion ? undefined : 300,
                            }}
                            className="flex items-center justify-center"
                          >
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-800/80 border border-gray-700/30 flex items-center justify-center hover:border-gray-600/50 transition-colors">
                              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${feature.color}`} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="relative mt-4 flex items-center justify-center gap-2">
                <span className="text-2xl" role="img" aria-label="Relieved face">
                  😌
                </span>
                <span className="text-sm text-gray-400">
                  Everything in one place
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: prefersReducedMotion ? 0 : 0.6 }}
          className="text-center mt-10 text-gray-400 font-serif italic"
        >
          Why manage five apps when one does it all?
        </motion.p>
      </div>
    </section>
  );
}
