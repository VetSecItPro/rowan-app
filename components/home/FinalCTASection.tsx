/**
 * FinalCTASection — Bottom-of-page call-to-action
 *
 * "Ready to stop being the family secretary?"
 * MagneticButton CTA → /signup with subtle radial glow.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import Link from 'next/link';

/** Renders the final call-to-action section at the bottom of the landing page. */
export function FinalCTASection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
        className="relative max-w-2xl mx-auto text-center"
      >
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
          Ready to stop being the{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            family secretary
          </span>
          ?
        </h2>

        <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-lg mx-auto">
          Join families who finally got their sanity back.
        </p>

        <MagneticButton>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold text-base rounded-full transition-all shadow-lg shadow-blue-500/25 active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Start Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </MagneticButton>

        <p className="text-xs text-gray-400 mt-4">
          No credit card required. Cancel anytime.
        </p>
      </motion.div>
    </section>
  );
}
