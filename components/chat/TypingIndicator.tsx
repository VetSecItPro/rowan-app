/**
 * TypingIndicator — Staggered bouncing dots with "Rowan is typing..." label
 *
 * Used when the assistant is streaming but hasn't produced text yet.
 * Framer Motion staggered children for a polished bounce effect.
 */

'use client';

import { motion } from 'framer-motion';

const dotVariants = {
  initial: { y: 0 },
  animate: { y: [0, -4, 0] },
};

/** Renders an animated typing indicator while the AI is generating a response. */
export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 0.2,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
            className="w-2 h-2 bg-gray-400 rounded-full"
          />
        ))}
      </div>
      <span className="text-xs text-gray-400">Rowan is typing...</span>
    </div>
  );
}
