import type { Variants, Transition } from 'framer-motion';

// ─── Reusable Framer Motion Variants ─────────────────────────────────
// Import and spread into motion components:
//
//   <motion.button whileTap={buttonPress.whileTap}>Click</motion.button>
//   <motion.div variants={fadeInUp} initial="hidden" animate="visible">...</motion.div>
//   <motion.ul variants={stagger} initial="hidden" animate="visible">
//     <motion.li variants={fadeInUp}>item</motion.li>
//   </motion.ul>

// ─── Button Press ────────────────────────────────────────────────────
// Subtle scale-down on tap for tactile feedback
export const buttonPress = {
  whileTap: { scale: 0.97 },
  transition: { type: 'spring', stiffness: 400, damping: 17 } as Transition,
};

// ─── Card Hover ──────────────────────────────────────────────────────
// Gentle scale-up with shadow lift on hover
export const cardHover = {
  whileHover: {
    scale: 1.01,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  whileTap: { scale: 0.99 },
};

// ─── Checkbox Complete ───────────────────────────────────────────────
// Scale pop on completion with color fill
export const checkboxComplete: Variants = {
  unchecked: {
    scale: 1,
    backgroundColor: 'transparent',
  },
  checked: {
    scale: [1, 1.2, 1],
    backgroundColor: 'rgb(34 197 94)', // green-500
    transition: {
      scale: { type: 'spring', stiffness: 500, damping: 15 },
      backgroundColor: { duration: 0.15 },
    },
  },
};

// ─── Success Flash ───────────────────────────────────────────────────
// Brief green tint overlay for success confirmations
export const successFlash: Variants = {
  hidden: {
    opacity: 0,
    backgroundColor: 'rgba(34, 197, 94, 0)',
  },
  visible: {
    opacity: [0, 0.15, 0],
    backgroundColor: ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0)'],
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
};

// ─── Fade In Up ──────────────────────────────────────────────────────
// Standard entrance: opacity 0 -> 1, y 20 -> 0
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad
    },
  },
};

// ─── Fade In ─────────────────────────────────────────────────────────
// Simple opacity fade
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

// ─── Scale In ────────────────────────────────────────────────────────
// Pop-in from slightly smaller
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
};

// ─── Slide In From Bottom ────────────────────────────────────────────
// Mobile sheet-style entrance
export const slideInBottom: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// ─── Stagger Container ──────────────────────────────────────────────
// Parent container that staggers children animations.
// Use with fadeInUp (or any variant) on child motion elements.
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

// Slower stagger for more dramatic reveals
export const staggerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

// ─── List Item ───────────────────────────────────────────────────────
// For use as child of stagger container
export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

// ─── Notification Enter ──────────────────────────────────────────────
// Toast/notification slide-in from top-right
export const notificationEnter: Variants = {
  hidden: { opacity: 0, y: -20, x: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

// ─── Collapse / Expand ──────────────────────────────────────────────
// For accordion-style height animations
export const collapse: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};
