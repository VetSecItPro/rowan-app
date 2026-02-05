'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Tablet, Laptop, ChevronDown, Share, Plus } from 'lucide-react';

interface InstallSectionProps {
  onSignupClick: () => void;
}

const devices = [
  { icon: Smartphone, label: 'Phone' },
  { icon: Tablet, label: 'Tablet' },
  { icon: Laptop, label: 'Desktop' },
];

export function InstallSection({ onSignupClick }: InstallSectionProps) {
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto text-center">
        {/* Main Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-white mb-6"
        >
          Ready to simplify your household?
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
        >
          Join families who are finally getting organized — with one app for everything.
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <button
            onClick={onSignupClick}
            className="px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.03] active:scale-[0.98]"
            aria-label="Get started with a free trial"
          >
            Get Started Free
          </button>
        </motion.div>

        {/* Trust Text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-5 text-sm text-gray-500"
        >
          No credit card required &middot; 14-day free trial &middot; Cancel anytime
        </motion.p>

        {/* Device Icons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 mb-10"
        >
          <p className="text-sm text-gray-500 mb-4">Available on all devices</p>
          <div className="flex items-center justify-center gap-8">
            {devices.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* PWA Install Accordion */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-lg mx-auto"
        >
          <button
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-gray-800/40 border border-gray-700/40 hover:bg-gray-800/60 transition-colors text-left"
            aria-expanded={isAccordionOpen}
            aria-controls="pwa-install-content"
          >
            <span className="text-sm text-gray-400">
              Install as an app on your device
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                isAccordionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {isAccordionOpen && (
              <motion.div
                id="pwa-install-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 px-1">
                  {/* iOS */}
                  <div className="rounded-xl bg-gray-800/30 border border-gray-700/30 p-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">iPhone / iPad</span>
                    </div>
                    <ol className="space-y-1.5 text-xs text-gray-400">
                      <li className="flex items-center gap-1.5">
                        <span className="text-blue-400 font-semibold">1.</span>
                        Open in Safari
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-blue-400 font-semibold">2.</span>
                        Tap
                        <Share className="inline w-3 h-3 text-blue-400" />
                        Share
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-blue-400 font-semibold">3.</span>
                        Tap
                        <Plus className="inline w-3 h-3 text-blue-400" />
                        Add to Home Screen
                      </li>
                    </ol>
                  </div>

                  {/* Android */}
                  <div className="rounded-xl bg-gray-800/30 border border-gray-700/30 p-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">Android</span>
                    </div>
                    <ol className="space-y-1.5 text-xs text-gray-400">
                      <li className="flex items-center gap-1.5">
                        <span className="text-blue-400 font-semibold">1.</span>
                        Open in Chrome
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-blue-400 font-semibold">2.</span>
                        Tap menu
                        <span className="text-blue-400">(&#8942;)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-blue-400 font-semibold">3.</span>
                        Tap Install App
                      </li>
                    </ol>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
