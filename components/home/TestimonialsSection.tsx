/**
 * TestimonialsSection — Placeholder testimonial cards
 *
 * 3 testimonials with star ratings, horizontal scroll on mobile,
 * 3-column grid on desktop. Clearly marked as placeholders for
 * real quotes later.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';

// ---------------------------------------------------------------------------
// Testimonial data (placeholders)
// ---------------------------------------------------------------------------

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatarInitial: string;
  avatarColor: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "We used to have sticky notes everywhere and a shared spreadsheet nobody updated. Rowan replaced all of it in one weekend.",
    author: 'Sarah M.',
    role: 'Mom of 3, Texas',
    avatarInitial: 'S',
    avatarColor: 'bg-emerald-500',
    rating: 5,
  },
  {
    quote: "My husband and I finally stopped the 'did you get milk?' texts. The shared shopping list alone is worth it.",
    author: 'Jessica R.',
    role: 'Working Parent, California',
    avatarInitial: 'J',
    avatarColor: 'bg-purple-500',
    rating: 5,
  },
  {
    quote: "As a military family that moves often, having one app for everything (chores, meals, budget) has been a game changer.",
    author: 'Mike T.',
    role: 'Army Veteran, Virginia',
    avatarInitial: 'M',
    avatarColor: 'bg-blue-500',
    rating: 5,
  },
];

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Renders a carousel of user testimonial quotes. */
export function TestimonialsSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Families love{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Rowan
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-lg mx-auto">
            See how real families are simplifying their daily chaos.
          </p>
        </motion.div>

        {/* Cards — horizontal scroll on mobile, grid on desktop */}
        <div className="relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.author}
              variants={prefersReducedMotion ? {} : cardVariants}
              className="min-w-[280px] md:min-w-0 snap-center flex-shrink-0 rounded-2xl bg-gray-800/50 border border-gray-700/50 p-6"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-gray-300 leading-relaxed mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full ${t.avatarColor} flex items-center justify-center text-white text-xs font-semibold`}
                >
                  {t.avatarInitial}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.author}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        {/* Scroll fade hint — mobile only */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent lg:hidden" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
